
A modular Java REST API application providing user authentication, user management, and resource management for itinerary, book, and review entities.

---

## Overview

The DateSpot API is built with Spring Boot and delivers a clean, layered architecture for handling:

- **User Authentication**: register and authenticate users via JSON Web Tokens (JWT)
- **User & Security Management**: user profile operations, password changes, role/permission enforcement, and token revocation
- **Itinerary Management**: CRUD operations for itineraries
- **Book Management**: CRUD operations for books
- **Review Management**: create, read, update, and delete reviews for locations

Each functional area is separated into its own package, leveraging Spring Data JPA repositories, service classes, and REST controllers. Entity auditing automatically captures creation and modification metadata. Lombok annotations reduce boilerplate, and Spring Security/JWT provide stateless protection.

---

## Functionality

### Authentication Module

- **Register**: `POST /api/v1/auth/register` accepts a `RegisterRequest` and persists a new user
- **Login**: `POST /api/v1/auth/authenticate` verifies credentials and returns a JWT token
- **Token Handling**: JWTs are stored in the `Token` entity; expired or revoked tokens are filtered out for security

### User & Security Module

- **Get Current User**: `GET /api/v1/users/me` returns the authenticated user's profile
- **Change Password**: `PATCH /api/v1/users` accepts a `ChangePasswordRequest` (current, new, confirmation) to update user password
- **Role & Permission Enforcement**: `Role` enum defines `USER`, `MANAGER`, `ADMIN` with associated `Permission` sets; Spring Security ensures only authorized roles can access protected endpoints

### Itinerary Module

- Work in progress

### Posts Module

- Work in progress

### Review Module

- Work in progress

---

## Features

- **Layered Architecture**: separation of concerns between controllers, services, and repositories for maintainability
- **Spring Data JPA**: repository interfaces for rapid CRUD operations
- **Entity Auditing**: automatic population of `@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, and `@LastModifiedBy`
- **Lombok**: reduces boilerplate with `@Data`, `@Builder`, `@RequiredArgsConstructor`, and more
- **Spring Security & JWT**: stateless authentication with token persistence and revocation support
- **Role-Based Access Control**: fine-grained permissions via `Role` and `Permission` enums
- **RESTful Design**: consistent HTTP methods and URL patterns

---

## Tech Stack

- **Language**: Java 17
- **Frameworks & Libraries**:
  - Spring Boot (Web, Data JPA, Security, Auditing)
  - Spring Security (JWT Authentication)
  - Lombok
  - Jakarta Persistence (JPA)
- **Build Tool**: Maven
- **Database**: PostgreSQL
