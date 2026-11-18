import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection';
import { config } from '../config';

export const adminLogin = async (req: Request, res: Response) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ message: 'Login ID and password are required' });
  }
  try {
    const [rows]: any = await pool.query('SELECT * FROM administrators WHERE login_id = ?', [loginId]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    
    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
    res.cookie('votex_token', token, { httpOnly: true, secure: config.nodeEnv === 'production' });
    res.json({ message: 'Logged in successfully', user: { id: admin.id, role: admin.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const voterLogin = async (req: Request, res: Response) => {
  const { roomNumber, voterId } = req.body;
  if (!roomNumber || !voterId) {
    return res.status(400).json({ message: 'Room number and voter ID are required' });
  }
  try {
    const [rooms]: any = await pool.query('SELECT id, status FROM election_rooms WHERE room_number = ?', [roomNumber]);
    if (rooms.length === 0) return res.status(404).json({ message: 'Room not found' });
    const election = rooms[0];

    if (election.status === 'closed') {
      return res.status(403).json({ message: 'Voting has ended for this election room' });
    }

    const [voters]: any = await pool.query('SELECT id FROM voters WHERE voter_id = ?', [voterId]);
    if (voters.length === 0) return res.status(401).json({ message: 'Voter not found' });
    const voter = voters[0];

    const [roomVoters]: any = await pool.query('SELECT * FROM room_voters WHERE election_id = ? AND voter_id = ?', [election.id, voter.id]);
    if (roomVoters.length === 0) return res.status(403).json({ message: 'Not registered for this room' });

    const token = jwt.sign({ id: voter.id, electionId: election.id, role: 'voter', roomNumber }, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
    res.cookie('votex_token', token, { httpOnly: true, secure: config.nodeEnv === 'production' });
    res.json({ message: 'Logged in successfully', user: { id: voter.id, role: 'voter', roomNumber, electionId: election.id } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Public self-registration: a voter enters their own details for a room.
// Face/ID-photo enrollment is still admin-only, so a self-registered voter
// cannot vote until an administrator has enrolled and verified their photo.
export const voterRegister = async (req: Request, res: Response) => {
  const roomNumber = String(req.body.roomNumber || '').trim();
  const voterId = String(req.body.voterId || '').trim();
  const fullName = String(req.body.fullName || '').trim();
  const email = String(req.body.email || '').trim();

  if (!roomNumber || !voterId || !fullName || !email) {
    return res.status(400).json({ message: 'Room number, voter ID, full name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  if (voterId.length > 100 || fullName.length > 255 || email.length > 255) {
    return res.status(400).json({ message: 'One or more fields are too long' });
  }

  try {
    const [rooms]: any = await pool.query('SELECT id, status FROM election_rooms WHERE room_number = ?', [roomNumber]);
    if (rooms.length === 0) return res.status(404).json({ message: 'Room not found. Check the room number given by the administrator.' });
    const election = rooms[0];
    if (election.status === 'closed') {
      return res.status(403).json({ message: 'Registration is closed for this election room' });
    }

    const [existing]: any = await pool.query('SELECT id, email FROM voters WHERE voter_id = ?', [voterId]);
    let voterDbId: number;
    if (existing.length > 0) {
      // Don't let someone re-use an existing voter ID with different details
      if (String(existing[0].email).toLowerCase() !== email.toLowerCase()) {
        return res.status(409).json({ message: 'This Voter ID is already registered with a different email' });
      }
      voterDbId = existing[0].id;
    } else {
      const [ins]: any = await pool.query(
        'INSERT INTO voters (voter_id, full_name, email) VALUES (?, ?, ?)',
        [voterId, fullName, email]
      );
      voterDbId = ins.insertId;
    }

    const [roomCheck]: any = await pool.query(
      'SELECT id FROM room_voters WHERE election_id = ? AND voter_id = ?',
      [election.id, voterDbId]
    );
    if (roomCheck.length > 0) {
      return res.status(409).json({ message: `Voter ${voterId} is already registered in this room. You can log in.` });
    }

    await pool.query('INSERT INTO room_voters (election_id, voter_id) VALUES (?, ?)', [election.id, voterDbId]);
    await pool.query(
      'INSERT INTO audit_logs (election_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [election.id, 'VOTER_REGISTERED', `Voter ${voterId} self-registered`, req.ip]
    );

    res.status(201).json({ message: 'Registration successful. An administrator must enroll your ID photo before you can vote.' });
  } catch (error) {
    console.error('Voter self-registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout =(req: Request, res: Response) => {
  res.clearCookie('votex_token');
  res.json({ message: 'Logged out successfully' });
};

export const getMe = (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user });
};
