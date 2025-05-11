A TypeScript-based RESTful API for managing quizzes, questions, and user attempts. Built with Express, Sequelize (configured via `database.json`), and PostgreSQL/MySQL (or SQLite) for persistence. Includes testing with Jest, linting with ESLint, and CI configured through GitLab CI.

---

## Overview

The Quiz App Backend provides endpoints for:

- **User Management**: registration, authentication, and profile retrieval.
- **Quiz Management**: creation, retrieval, updating, and deletion of quizzes.
- **Question & Answer Management**: attach multiple-choice or open-ended questions to quizzes.
- **Attempt Tracking**: users can submit answers and receive immediate scoring and feedback.

Core components are organized under the `src` directory with clear separation of concerns:

- **Models**: define data schemas and ORM mappings (e.g., `User`, `Quiz`, `Question`, `Attempt`).
- **Controllers**: handle HTTP requests/responses for each resource.
- **Services**: encapsulate business logic (e.g., scoring algorithms).
- **Routes**: wire paths to controllers and apply validation/middleware.
- **Middleware**: JWT-based authentication, error handling, request validation.

---

## Functionality

### Authentication & Authorization

- **POST /auth/register**: create a new user account.
- **POST /auth/login**: authenticate credentials and return a JWT.
- **GET /auth/profile**: retrieve the current user’s profile (requires valid JWT).

### Quizzes

- **GET /quizzes**: list all quizzes with pagination.
- **GET /quizzes/:id**: fetch a single quiz by ID.
- **POST /quizzes**: create a new quiz (protected).
- **PATCH /quizzes/:id**: update quiz metadata or questions (protected).
- **DELETE /quizzes/:id**: delete a quiz (protected).

### Questions

- **POST /quizzes/:quizId/questions**: add a question to a quiz (protected).
- **PATCH /questions/:id**: update question text or options (protected).
- **DELETE /questions/:id**: remove a question (protected).

### Attempts & Scoring

- **POST /quizzes/:quizId/attempts**: submit answers, calculate score, and save attempt.
- **GET /users/:userId/attempts**: list all attempts by a user (protected).

---

## Features

- **Express & TypeScript**: robust type safety and middleware-driven architecture.
- **Sequelize ORM**: easy model definitions and migrations via `database.json`.
- **Validation**: request payloads validated with `Joi` or custom decorators.
- **JWT Security**: stateless authentication and role-based access control.
- **Automated Testing**: unit and integration tests using Jest & Supertest.
- **Linting & Formatting**: ESLint and Prettier enforce code consistency.
- **CI/CD Pipeline**: GitLab CI pipeline for linting, testing, and deployment.

---

## Tech Stack

- **Runtime**: Node.js 16+  
- **Language**: TypeScript 4+  
- **Framework**: Express 4+  
- **ORM**: Sequelize 6+  
- **Database**: PostgreSQL, MySQL, or SQLite via `database.json`  
- **Testing**: Jest, Supertest  
- **Linting**: ESLint, Babel (`.babelrc`)  
- **CI**: GitLab CI (`.gitlab-ci.yml`)  

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rogertruong7/Quiz-App-Backend.git
   cd Quiz-App-Backend