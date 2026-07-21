-- Migration 028: Make tasks.assigned_to nullable for multi-assignee support
-- Run this AFTER 027_task_assignees.sql

ALTER TABLE tasks ALTER COLUMN assigned_to DROP NOT NULL;
