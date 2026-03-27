-- ============================================================
-- Migration 021: Add Zone, StateCode, ContactNo, Pincode to sales.Stores
-- ============================================================
USE RetailERP;
GO

-- Add missing columns to sales.Stores
ALTER TABLE sales.Stores
ADD Zone          NVARCHAR(20)  NULL,
    StateCode     NVARCHAR(5)   NULL,
    ContactNo     NVARCHAR(20)  NULL,
    Pincode       NVARCHAR(10)  NULL;
GO
