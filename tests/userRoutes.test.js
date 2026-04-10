process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const User = require('../src/models/User');

let mongoServer;

const createTokenForRole = async (role) => {
  const user = await User.create({
    name: `${role} User`,
    email: `${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}@user.local`,
    password: 'Secret123!',
    role
  });

  return {
    token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    user
  };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.disconnect();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Routes API Endpoints', () => {
  it('should return current user profile for authenticated user', async () => {
    const { token, user } = await createTokenForRole('user');

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(user._id.toString());
  });

  it('should allow admin to list all users', async () => {
    const { token } = await createTokenForRole('admin');
    await createTokenForRole('user');

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should block non-admin users from listing all users', async () => {
    const { token } = await createTokenForRole('user');

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should block a user from reading another user profile', async () => {
    const { token: viewerToken } = await createTokenForRole('user');
    const { user: otherUser } = await createTokenForRole('user');

    const res = await request(app)
      .get(`/api/users/${otherUser._id}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
