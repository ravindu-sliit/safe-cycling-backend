process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const Review = require('../src/models/Review');
const Route = require('../src/models/Route');
const User = require('../src/models/User');

let mongoServer;

const createTokenForRole = async (role) => {
  const user = await User.create({
    name: `${role} Reviewer`,
    email: `${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}@review.local`,
    password: 'Secret123!',
    role
  });

  return {
    token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    user
  };
};

const createRouteDoc = async (title = 'Review Route') => {
  return Route.create({
    title,
    distance: 9.5,
    ecoScore: 8,
    startLocation: {
      type: 'Point',
      coordinates: [79.8612, 6.9271],
      address: 'Start'
    },
    endLocation: {
      type: 'Point',
      coordinates: [79.8712, 6.9371],
      address: 'End'
    },
    pathCoordinates: [
      { lng: 79.8612, lat: 6.9271 },
      { lng: 79.8712, lat: 6.9371 }
    ]
  });
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
  await Review.deleteMany({});
  await Route.deleteMany({});
  await User.deleteMany({});
});

describe('Review Routes API Endpoints', () => {
  
  it('should create a review for a route', async () => {
    const route = await createRouteDoc('Negombo Ride');
    const { token } = await createTokenForRole('user');

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        route: route._id.toString(),
        rating: 4,
        difficulty: 'Easy',
        distance: 9.5,
        comment: 'Well marked and safe'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.rating).toBe(4);
    expect(res.body.data.difficulty).toBe('Easy');
  });

  it('should return reviews publicly by route', async () => {
    const route = await createRouteDoc('Colombo Loop');
    const { user } = await createTokenForRole('user');

    // Seed the database with a review using the correct modern schema
    await Review.create({
      route: route._id,
      user: user._id,
      rating: 5,
      difficulty: 'Medium',
      distance: 15.2,
      comment: 'Good ride'
    });

    const res = await request(app).get(`/api/reviews/route/${route._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.count).toBe(1);
  });

  it('should reject creating a duplicate review by same user for same route', async () => {
    const route = await createRouteDoc('Duplicate Guard Route');
    const { user, token } = await createTokenForRole('user');

    // Create the first review
    await Review.create({
      route: route._id,
      user: user._id,
      rating: 3,
      difficulty: 'Hard',
      distance: 20.0,
      comment: 'First review'
    });

    // Attempt to post a second review to the exact same route
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        route: route._id.toString(),
        rating: 4,
        difficulty: 'Medium',
        distance: 20.0,
        comment: 'Duplicate review'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should block non-admin users from listing all reviews', async () => {
    const { token } = await createTokenForRole('user');

    const res = await request(app)
      .get('/api/reviews')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});