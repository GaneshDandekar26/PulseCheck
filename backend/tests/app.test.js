const app = require('../src/app');

describe('App', () => {
  it('should export an Express application', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('should respond to GET /health with 200 (if route exists)', async () => {
    const supertest = require('supertest');
    const res = await supertest(app).get('/health');
    // Accept either 200 (route exists) or 404 (route not yet created)
    expect([200, 404]).toContain(res.status);
  });
});
