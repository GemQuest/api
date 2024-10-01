// jest.setup.ts

// Optional: Extend expect with additional matchers if needed
// import '@testing-library/jest-dom';

// Mock environment variables if necessary
process.env.JWT_SECRET = 'testsecret';
process.env.SMTP_HOST = 'ssl0.ovh.net';
process.env.SMTP_PORT = '465';
process.env.SMTP_SECURE = 'true';
process.env.SMTP_USER = 'gemquest@web3-together.com';
process.env.SMTP_PASS = 'gff1q82jIWTuS1F12b7V';
process.env.NODE_ENV = 'test';
