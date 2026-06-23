#!/usr/bin/env bash
# Build frontend
npm install
npm run build

# Install backend dependencies
cd backend
npm install
