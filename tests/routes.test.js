process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

jest.mock('axios');

const app = require('../src/server');
const Route = require('../src/models/Route');
const User = require('../src/models/User');

let mongoServer;

const createAdminToken = async () => {
  const admin = await User.create({
    name: 'Admin Tester',
    email: `admin-${Date.now()}@test.local`,
    password: 'Secret123!',
    role: 'admin'
  });

  return jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const createTokenForRole = async (role) => {
  const user = await User.create({
    name: `${role} Tester`,
    email: `${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.local`,
    password: 'Secret123!',
    role
  });

  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
  await Route.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();
});

describe('Cycling Routes API Endpoints', () => {
  it('should create a new cycling route', async () => {
    const token = await createAdminToken();

    axios.get.mockResolvedValue({
      data: {
        features: [
          {
            properties: { summary: { distance: 5200 } },
            geometry: {
              coordinates: [
                [79.8612, 6.9271],
                [79.8622, 6.9281]
              ]
            }
          }
        ]
      }
    });

    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Lake Ride',
        ecoScore: 9,
        startLocation: {
          type: 'Point',
          coordinates: [79.8612, 6.9271],
          address: 'Start Point'
        },
        endLocation: {
          type: 'Point',
          coordinates: [79.8622, 6.9281],
          address: 'End Point'
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.title).toBe('Test Lake Ride');
    expect(res.body.data.distance).toBe(5.2);
    expect(Array.isArray(res.body.data.pathCoordinates)).toBe(true);
  });

  it('should fetch all cycling routes', async () => {
    await Route.create({
      title: 'City Loop',
      distance: 10,
      ecoScore: 8,
      startLocation: {
        type: 'Point',
        coordinates: [79.8601, 6.9201],
        address: 'City Start'
      },
      endLocation: {
        type: 'Point',
        coordinates: [79.8701, 6.9301],
        address: 'City End'
      },
      pathCoordinates: [
        { lng: 79.8601, lat: 6.9201 },
        { lng: 79.8701, lat: 6.9301 }
      ]
    });

    const res = await request(app).get('/api/routes');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].title).toBe('City Loop');
  });

  it('should delete a route by ID', async () => {
    const token = await createAdminToken();

    const newRoute = await Route.create({
      title: 'To Delete',
      distance: 2,
      ecoScore: 5,
      startLocation: {
        type: 'Point',
        coordinates: [79.8501, 6.9101],
        address: 'Delete Start'
      },
      endLocation: {
        type: 'Point',
        coordinates: [79.8511, 6.9111],
        address: 'Delete End'
      },
      pathCoordinates: [
        { lng: 79.8501, lat: 6.9101 },
        { lng: 79.8511, lat: 6.9111 }
      ]
    });

    const res = await request(app)
      .delete(`/api/routes/${newRoute._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const checkDb = await Route.findById(newRoute._id);
    expect(checkDb).toBeNull();
  });

  it('should reject create route when token is missing', async () => {
    const res = await request(app)
      .post('/api/routes')
      .send({
        title: 'Unauthorized Create',
        ecoScore: 7,
        startLocation: {
          type: 'Point',
          coordinates: [79.8612, 6.9271],
          address: 'Start Point'
        },
        endLocation: {
          type: 'Point',
          coordinates: [79.8622, 6.9281],
          address: 'End Point'
        }
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject delete route for non-admin role', async () => {
    const userToken = await createTokenForRole('user');

    const routeToDelete = await Route.create({
      title: 'Protected Route',
      distance: 2.5,
      ecoScore: 6,
      startLocation: {
        type: 'Point',
        coordinates: [79.8501, 6.9101],
        address: 'Delete Start'
      },
      endLocation: {
        type: 'Point',
        coordinates: [79.8511, 6.9111],
        address: 'Delete End'
      },
      pathCoordinates: [
        { lng: 79.8501, lat: 6.9101 },
        { lng: 79.8511, lat: 6.9111 }
      ]
    });

    const res = await request(app)
      .delete(`/api/routes/${routeToDelete._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when deleting a route that does not exist', async () => {
    const token = await createAdminToken();
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/routes/${missingId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
