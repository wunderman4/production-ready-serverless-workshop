module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/test_cases/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
