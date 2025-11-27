import { CodeParser } from './CodeParser';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CodeParser', () => {
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser();
  });

  describe('parseFile', () => {
    it('should parse JavaScript files', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'test.js');
      const testCode = `
function greet(name) {
  return 'Hello, ' + name;
}
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const result = await parser.parseFile(testFile, 'javascript');
      
      expect(result.language).toBe('javascript');
      expect(result.filePath).toBe(testFile);
      expect(result.ast).toBeDefined();
      
      await fs.unlink(testFile);
    });

    it('should parse TypeScript files', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'test.ts');
      const testCode = `
interface User {
  name: string;
}

function greet(user: User): string {
  return 'Hello, ' + user.name;
}
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const result = await parser.parseFile(testFile, 'typescript');
      
      expect(result.language).toBe('typescript');
      expect(result.filePath).toBe(testFile);
      expect(result.ast).toBeDefined();
      
      await fs.unlink(testFile);
    });

    it('should parse Python files', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'test.py');
      const testCode = `
def greet(name):
    return f"Hello, {name}"
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const result = await parser.parseFile(testFile, 'python');
      
      expect(result.language).toBe('python');
      expect(result.filePath).toBe(testFile);
      expect(result.ast).toBeDefined();
      
      await fs.unlink(testFile);
    });

    it('should throw error for unsupported language', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'test.rb');
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, 'puts "Hello"');

      await expect(parser.parseFile(testFile, 'ruby')).rejects.toThrow('Unsupported language: ruby');
      
      await fs.unlink(testFile);
    });
  });

  describe('extractFunctions', () => {
    it('should extract JavaScript functions', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'functions.js');
      const testCode = `
function add(a, b) {
  return a + b;
}

const multiply = (x, y) => x * y;
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'javascript');
      const functions = parser.extractFunctions(parsed);
      
      expect(functions.length).toBeGreaterThanOrEqual(1);
      expect(functions[0].name).toBe('add');
      expect(functions[0].parameters).toHaveLength(2);
      
      await fs.unlink(testFile);
    });

    it('should extract Python functions', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'functions.py');
      const testCode = `
def add(a, b):
    """Add two numbers"""
    return a + b

def greet(name: str) -> str:
    return f"Hello, {name}"
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'python');
      const functions = parser.extractFunctions(parsed);
      
      expect(functions.length).toBe(2);
      expect(functions[0].name).toBe('add');
      expect(functions[0].parameters).toHaveLength(2);
      expect(functions[1].name).toBe('greet');
      
      await fs.unlink(testFile);
    });
  });

  describe('extractClasses', () => {
    it('should extract JavaScript classes', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'classes.js');
      const testCode = `
class Person {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    return 'Hello, ' + this.name;
  }
}
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'javascript');
      const classes = parser.extractClasses(parsed);
      
      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Person');
      expect(classes[0].methods.length).toBeGreaterThanOrEqual(1);
      
      await fs.unlink(testFile);
    });

    it('should extract Python classes', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'classes.py');
      const testCode = `
class Person:
    def __init__(self, name):
        self.name = name
    
    def greet(self):
        return f"Hello, {self.name}"
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'python');
      const classes = parser.extractClasses(parsed);
      
      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Person');
      expect(classes[0].methods.length).toBe(2);
      
      await fs.unlink(testFile);
    });
  });

  describe('extractAPIs', () => {
    it('should extract Express API endpoints', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'api.js');
      const testCode = `
const express = require('express');
const app = express();

app.get('/users', getUsers);
app.post('/users/:id', updateUser);
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'javascript');
      const apis = parser.extractAPIs(parsed);
      
      expect(apis.length).toBe(2);
      expect(apis[0].method).toBe('GET');
      expect(apis[0].path).toBe('/users');
      expect(apis[1].method).toBe('POST');
      expect(apis[1].path).toBe('/users/:id');
      
      await fs.unlink(testFile);
    });
  });

  describe('extractImports', () => {
    it('should extract JavaScript imports', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'imports.js');
      const testCode = `
import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'javascript');
      const imports = parser.extractImports(parsed);
      
      expect(imports.length).toBe(3);
      expect(imports[0].source).toBe('react');
      expect(imports[0].isDefault).toBe(true);
      
      await fs.unlink(testFile);
    });

    it('should extract Python imports', async () => {
      const testFile = path.join(__dirname, '__fixtures__', 'imports.py');
      const testCode = `
import os
from typing import List, Dict
      `;
      
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testCode);

      const parsed = await parser.parseFile(testFile, 'python');
      const imports = parser.extractImports(parsed);
      
      expect(imports.length).toBeGreaterThanOrEqual(1);
      expect(imports[0].source).toBe('os');
      
      await fs.unlink(testFile);
    });
  });

  afterAll(async () => {
    // Clean up fixtures directory
    const fixturesDir = path.join(__dirname, '__fixtures__');
    try {
      await fs.rm(fixturesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});
