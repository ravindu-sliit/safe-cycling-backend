process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const HazardReport = require('../src/models/HazardReport');
const User = require('../src/models/User');

let mongoServer;

const createTokenForRole = async (role) => {
  const user = await User.create({
    name: `${role} Tester`,
    email: `${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.local`,
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
  await HazardReport.deleteMany({});
  await User.deleteMany({});
});

describe('Hazard Routes API Endpoints', () => {
  it('should create a hazard for an authenticated user', async () => {
    const { token } = await createTokenForRole('user');

    const res = await request(app)
      .post('/api/hazards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Big pothole near junction',
        description: 'Deep pothole causing risk for cyclists',
        type: 'pothole',
        severity: 'high',
        locationName: 'Main Junction',
        location: {
          type: 'Point',
          coordinates: [79.8612, 6.9271]
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe('Big pothole near junction');
    expect(res.body.type).toBe('pothole');
  });

  it('should return hazards publicly', async () => {
    const { user } = await createTokenForRole('user');

    await HazardReport.create({
      title: 'Debris on lane',
      description: 'Debris scattered on cycle lane',
      type: 'debris',
      severity: 'medium',
      status: 'reported',
      locationName: 'Lake Road',
      location: {
        type: 'Point',
        coordinates: [79.8622, 6.9282]
      },
      createdBy: user._id
    });

    const res = await request(app).get('/api/hazards');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].title).toBe('Debris on lane');
  });

  it('should reject hazard creation when token is missing', async () => {
    const res = await request(app)
      .post('/api/hazards')
      .send({
        title: 'Unauthorized hazard',
        description: 'No token should fail',
        type: 'other',
        location: {
          type: 'Point',
          coordinates: [79.8612, 6.9271]
        }
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should block deleting another user hazard', async () => {
    const { token: ownerToken, user: owner } = await createTokenForRole('user');
    const { token: otherToken } = await createTokenForRole('user');

    const created = await request(app)
      .post('/api/hazards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Owner hazard',
        description: 'Owned by first user',
        type: 'other',
        location: {
          type: 'Point',
          coordinates: [79.865, 6.931]
        }
      });

    expect(created.statusCode).toBe(201);

    const res = await request(app)
      .delete(`/api/hazards/${created.body._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toBe(403);

    const stillExists = await HazardReport.findOne({ _id: created.body._id, createdBy: owner._id });
    expect(stillExists).not.toBeNull();
  });
});
