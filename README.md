# S-HMS — Hackathon Management Platform

> A full-stack web platform for managing the complete hackathon lifecycle — from contest discovery and team formation to project submission, evaluation, ranking, and result publication.

![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=FFFFFF)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=FFFFFF)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3-6DB33F?style=for-the-badge&logo=springboot&logoColor=FFFFFF)
![Spring Security](https://img.shields.io/badge/Spring_Security-JWT-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=FFFFFF)
![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=FFFFFF)

---

## Overview

S-HMS is a role-based hackathon management platform built to support the operational workflow of multi-stage competitions.

Instead of treating a hackathon as a simple registration and submission system, S-HMS models the different workflows required by students, judges, mentors, and administrators.

The platform covers:

- Contest discovery and registration
- Team creation and member management
- Multi-stage competition workflows
- Project submission
- Judge assignment
- Configurable evaluation rubrics
- Score calculation and review
- Leaderboards and result publication
- Role-based access control

The project is developed as a full-stack application with a strong focus on frontend architecture, reusable UI patterns, and complex business-driven interfaces.

---

## Product Workflow

```text
Contest Discovery
       │
       ▼
Registration & Team Formation
       │
       ▼
Project Submission
       │
       ▼
Judge Assignment
       │
       ▼
Rubric-based Evaluation
       │
       ▼
Score Review & Calibration
       │
       ▼
Ranking
       │
       ▼
Result Publication
```

Each stage exposes different actions and information depending on the user's role.

---

## Role-based Product Experience

S-HMS does not use a single dashboard with a collection of conditional buttons.

Each role has a different workflow and information hierarchy.

| Role | Primary Responsibilities |
|------|---------------------------|
| Guest | Discover contests, view public information and leaderboards |
| Student | Join contests, manage teams, submit projects and view results |
| Judge | Review assigned submissions and evaluate projects using rubrics |
| Mentor | Monitor teams and provide feedback during the competition |
| Admin | Configure contests, rounds, rubrics, experts, rankings and results |

This creates a frontend where routing, navigation, permissions, data presentation, and actions all depend on the current user context.

---

## Frontend Engineering

The frontend is the primary focus of this project.

### Authentication-aware Routing

Protected application areas are separated from public routes using React Router.

The routing layer handles:

- Authentication state
- Role-based access
- Protected routes
- Unauthorized navigation
- Redirect behavior
- Role-specific application layouts

This keeps access control close to the routing boundary instead of scattering authorization checks throughout individual components.

---

### Dynamic Rubric Evaluation

Judge evaluation screens are generated from rubric data provided by the backend.

```text
Backend Rubric
      │
      ▼
Criteria Mapping
      │
      ▼
Dynamic Form
      │
      ▼
Input Validation
      │
      ▼
Weighted Score
      │
      ▼
Evaluation Submission
```

A contest can therefore use different evaluation criteria without requiring a separate hardcoded frontend form.

This was one of the main frontend challenges because the UI needs to support variable numbers of criteria, weights, validation rules, score states, and calculated results.

---

### Reusable Component Architecture

Common UI patterns are extracted into reusable components rather than duplicated across feature pages.

Examples include:

- Data tables
- Dialogs
- Confirmation dialogs
- Form controls
- Status badges
- Navigation elements
- Loading states
- Empty states
- Error states

The objective is to keep feature-level components focused on business behavior while shared components handle common presentation and interaction patterns.

---

### API-driven UI States

Frontend screens account for the complete lifecycle of asynchronous requests.

```text
Request
  │
  ├── Loading
  │
  ├── Success
  │      ├── Data
  │      └── Empty State
  │
  └── Error
```

This pattern is applied across dashboards, team management, contest information, leaderboards, submissions, and evaluation workflows.

---

### Defensive Rendering

The frontend also handles variations in API response structures before rendering data.

For example, a backend field may be returned as either a primitive value or a nested object. Rendering logic normalizes the value before passing it to the UI.

This prevents common runtime failures such as:

```text
Objects are not valid as a React child
```

and makes the frontend more resilient when backend response structures evolve.

---

# Selected Engineering Challenges

## 01 — Building different experiences from one application

### Problem

Students, judges, mentors, and administrators interact with completely different parts of the system.

A single generic dashboard would quickly become difficult to navigate and maintain.

### Approach

The application separates:

- Public routes
- Authentication routes
- Role-specific routes
- Shared UI components
- Role-specific layouts

The result is a common application platform with distinct workflows rather than multiple disconnected applications.

---

## 02 — Rendering configurable evaluation interfaces

### Problem

Different hackathons may evaluate projects using different criteria.

Hardcoding fields such as:

```text
Innovation
Technical Complexity
Feasibility
Presentation
```

would make the frontend tightly coupled to one competition.

### Approach

Evaluation criteria are represented as data.

The frontend maps the received rubric structure into:

- Criteria sections
- Score inputs
- Validation rules
- Weight calculations
- Feedback fields
- Overall score presentation

### Result

The same evaluation interface can support different contests and scoring structures without rewriting the page.

---

## 03 — Managing complex administrative workflows

### Problem

The administration area contains large amounts of interconnected information:

```text
Contest
 ├── Rounds
 ├── Categories
 ├── Rubrics
 ├── Judges
 ├── Mentors
 ├── Teams
 └── Results
```

Displaying everything as isolated cards would make the interface difficult to scan.

### Approach

Administrative workflows are organized around:

- Data tables
- Filters
- Search
- Status indicators
- Focused configuration forms
- Contextual actions
- Master-detail relationships

This keeps complex operational data structured while allowing administrators to focus on one task at a time.

---

# Architecture

```text
┌──────────────────────────────────────────────┐
│                 React 18                     │
│                                              │
│  Pages · Components · Routing · UI State     │
│                                              │
└───────────────────────┬──────────────────────┘
                        │
                   REST API / JWT
                        │
┌───────────────────────▼──────────────────────┐
│              Spring Boot 3                   │
│                                              │
│  Controllers · Services · Repositories       │
│  Security · Validation · Business Logic      │
│                                              │
└───────────────────────┬──────────────────────┘
                        │
┌───────────────────────▼──────────────────────┐
│                SQL Server                    │
│                                              │
│  Relational Data · Transactions · Migration │
│                                              │
└──────────────────────────────────────────────┘
```

The frontend communicates with the backend through REST APIs.

Authentication and protected resources are handled through Spring Security and JWT.

---

# Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI development |
| Vite 5 | Development and build tooling |
| React Router v6 | Client-side routing |
| JavaScript / JSX | Application logic |
| Vanilla CSS | Styling and design system |
| Lucide React | Interface icons |

## Backend

| Technology | Purpose |
|------------|---------|
| Java 21 | Backend development |
| Spring Boot 3 | REST API |
| Spring Security | Authentication and authorization |
| JWT | Stateless authentication |
| Spring Data JPA | Data access |
| Hibernate | ORM |
| Flyway | Database migration |
| SQL Server 2022 | Relational database |

---

# Project Structure

```text
APP_TEST_DEMO/
│
├── FE/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── routers/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── BE/
│   ├── src/main/java/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── model/
│   │   ├── repository/
│   │   ├── service/
│   │   └── util/
│   │
│   └── src/main/resources/
│       ├── db/migration/
│       └── application.yaml
│
└── README.md
```

---

# Getting Started

## Prerequisites

Make sure the following are installed:

- Node.js 18+
- JDK 21+
- Maven 3.8+
- Microsoft SQL Server 2019/2022

---

## 1. Configure the Database

Create the required SQL Server database and configure the connection in:

```text
BE/src/main/resources/application.yaml
```

Example:

```yaml
spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=SHMS_DB;encrypt=true;trustServerCertificate=true
    username: YOUR_DB_USER
    password: YOUR_DB_PASSWORD
```

---

## 2. Start the Backend

```bash
cd BE
mvn clean compile
mvn spring-boot:run
```

Backend:

```text
http://localhost:8080
```

Swagger UI:

```text
http://localhost:8080/swagger-ui.html
```

---

## 3. Start the Frontend

Open another terminal:

```bash
cd FE
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Demo Accounts

The project includes seeded accounts for exploring the main role-specific workflows.

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin1` | `Admin1234` |
| Student / Leader | `datle2004` | `datle1234` |
| Student / Member | `quangne` | `Quang5123` |
| Judge | `judge1` | `Judge1123` |
| Mentor | `mentor1` | `Mentor1234` |

> These credentials are intended for local development and demonstration only.

---

# Recommended Demo Flow

For a quick technical walkthrough, the following order provides the clearest view of the system.

### 1. Guest

Start from the public home page.

Explore:

- Contest discovery
- Competition information
- Competition progress
- Public leaderboard

### 2. Student

Login as:

```text
datle2004
```

Explore:

- Student dashboard
- Competition participation
- Team management
- Project submission
- Progress tracking
- Results

### 3. Judge

Login as:

```text
judge1
```

Explore:

- Assigned competitions
- Assigned submissions
- Dynamic rubric
- Score input
- Evaluation workflow

### 4. Admin

Login as:

```text
admin1
```

Explore:

- Contest configuration
- Round configuration
- Rubric configuration
- Expert allocation
- Team management
- Ranking and result publication

This sequence demonstrates how the same platform changes according to the user's role and responsibilities.

---

# Engineering Decisions

## React + Vite

Vite provides a fast development environment and modern production build pipeline while keeping the frontend structure relatively lightweight.

## React Router

Routing is used as an architectural boundary between public pages, authenticated workspaces, and role-specific areas.

## Vanilla CSS

The project uses CSS variables and reusable styling patterns instead of relying heavily on a component framework.

This provides direct control over:

- Layout
- Responsive behavior
- Design tokens
- Component states
- Animations
- Theme styling

## Data-driven UI

Where possible, UI behavior is driven by backend data rather than hardcoded assumptions.

The rubric evaluation workflow is the clearest example of this approach.

---

# Testing

Current validation focuses on manual functional testing of the primary workflows:

- Authentication
- Protected routes
- Role-based navigation
- Contest discovery
- Team management
- Project submission
- Judge evaluation
- Leaderboards
- Result workflows
- Administrative configuration

Automated frontend testing has not yet been integrated.

---

# Future Improvements

Planned areas for further engineering work include:

- End-to-end testing with Playwright or Cypress
- Component testing with Vitest
- Accessibility improvements
- Keyboard navigation
- Performance optimization for large datasets
- More standardized global state management where cross-feature state requires it

---

# Project Context

**Project:** SEAL Hackathon Management System (S-HMS)  
**Course:** SWP391 — Software Engineering Project  
**Institution:** FPT University  
**Focus:** Full-stack web application with an emphasis on frontend engineering

---

## What this project demonstrates

S-HMS goes beyond implementing individual CRUD pages.

The project demonstrates how a frontend application can translate a complex business domain into a usable interface through:

- Role-based workflows
- Protected navigation
- Reusable components
- Dynamic forms
- API-driven rendering
- Validation
- Complex administrative interfaces
- Multiple asynchronous UI states
- Consistent interaction patterns

The main engineering challenge is keeping those workflows understandable and maintainable as the number of roles, features, and business rules grows.

---
