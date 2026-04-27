// examples/graphql-server.js
// ─────────────────────────────────────────────────────────────────────────────
//  GraphQL Server Example using @aksparadise/otel-observability
//
//  This example demonstrates GraphQL instrumentation with automatic tracing
//  of queries, mutations, and subscriptions.
// ─────────────────────────────────────────────────────────────────────────────

// ── IMPORTANT: These MUST be the first imports ───────────────────────────────
import "dotenv/config";
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { setupGlobalErrorHandler } from "@aksparadise/otel-observability/error-handler";
// ─────────────────────────────────────────────────────────────────────────────

import { createServer } from "http";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@apollo/server/express4";
import { withSpan, createCounter, createHistogram } from "@aksparadise/otel-observability";
import { sanitize } from "@aksparadise/otel-observability/sanitizer";
import express from "express";

// Setup global error handler
setupGlobalErrorHandler();

// ── Create metrics ───────────────────────────────────────────────────────────
const metrics = {
    queries: createCounter("graphql_queries_total", {
        description: "Total GraphQL queries",
    }),
    mutations: createCounter("graphql_mutations_total", {
        description: "Total GraphQL mutations",
    }),
    duration: createHistogram("graphql_operation_duration_ms", {
        description: "GraphQL operation duration",
        unit: "ms",
    }),
};

// ── GraphQL Schema ───────────────────────────────────────────────────────────
const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String!
  }

  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(email: String!, name: String!): User
    updateUser(id: ID!, name: String): User
  }
`;

// ── Mock Data ───────────────────────────────────────────────────────────────
const users = [
    { id: "1", email: "user1@example.com", name: "User 1" },
    { id: "2", email: "user2@example.com", name: "User 2" },
];

// ── Resolvers ───────────────────────────────────────────────────────────────
const resolvers = {
    Query: {
        user: async (_, { id }) => {
            const startTime = Date.now();
            
            const user = await withSpan("graphql.user", async (span) => {
                span.setAttribute("graphql.operation.name", "user");
                span.setAttribute("graphql.operation.type", "query");
                span.setAttribute("user.id", id);
                
                return users.find((u) => u.id === id);
            });
            
            metrics.duration.record(Date.now() - startTime, { operation: "user" });
            metrics.queries.add(1, { operation: "user" });
            
            return user;
        },
        
        users: async () => {
            const startTime = Date.now();
            
            const allUsers = await withSpan("graphql.users", async (span) => {
                span.setAttribute("graphql.operation.name", "users");
                span.setAttribute("graphql.operation.type", "query");
                
                return users;
            });
            
            metrics.duration.record(Date.now() - startTime, { operation: "users" });
            metrics.queries.add(1, { operation: "users" });
            
            return allUsers;
        },
    },
    
    Mutation: {
        createUser: async (_, { email, name }) => {
            const startTime = Date.now();
            
            const newUser = await withSpan("graphql.createUser", async (span) => {
                span.setAttribute("graphql.operation.name", "createUser");
                span.setAttribute("graphql.operation.type", "mutation");
                span.setAttribute("user.email", email);
                
                const user = {
                    id: String(users.length + 1),
                    email,
                    name,
                };
                users.push(user);
                
                logger.info("User created via GraphQL", { userId: user.id });
                
                return user;
            });
            
            metrics.duration.record(Date.now() - startTime, { operation: "createUser" });
            metrics.mutations.add(1, { operation: "createUser" });
            
            return newUser;
        },
        
        updateUser: async (_, { id, name }) => {
            const startTime = Date.now();
            
            const updatedUser = await withSpan("graphql.updateUser", async (span) => {
                span.setAttribute("graphql.operation.name", "updateUser");
                span.setAttribute("graphql.operation.type", "mutation");
                span.setAttribute("user.id", id);
                
                const user = users.find((u) => u.id === id);
                if (user) {
                    user.name = name;
                }
                
                logger.info("User updated via GraphQL", { userId: id });
                
                return user;
            });
            
            metrics.duration.record(Date.now() - startTime, { operation: "updateUser" });
            metrics.mutations.add(1, { operation: "updateUser" });
            
            return updatedUser;
        },
    },
};

// ── Create Apollo Server ─────────────────────────────────────────────────────
const httpServer = createServer();

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// ── Start Server ─────────────────────────────────────────────────────────────
await server.start();

const app = express();

app.use(
    "/graphql",
    expressMiddleware(server, {
        context: async ({ req }) => {
            // Extract user from headers for trace context
            const userId = req.headers["x-user-id"];
            if (userId) {
                // This will be picked up by the middleware if you add it
                logger.info("GraphQL request", { userId });
            }
            return {};
        },
    })
);

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

const PORT = 4000;

httpServer.listen(PORT, () => {
    logger.info(`GraphQL server ready at http://localhost:${PORT}/graphql`);
});

// ── Graceful shutdown ───────────────────────────────────────────────────────
import { shutdownOtel } from "@aksparadise/otel-observability/otel";

process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");
    await server.stop();
    await shutdownOtel();
    process.exit(0);
});

process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully");
    await server.stop();
    await shutdownOtel();
    process.exit(0);
});
