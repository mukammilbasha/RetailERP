-- ============================================================
-- Fix: Replace non-filtered UNIQUE constraints with filtered
-- unique indexes that exclude soft-deleted records (IsActive=0)
-- ============================================================
USE RetailERP;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- Brands (may already have been converted in a previous partial run)
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='Brands' AND i.name='UQ_Brands_Name_Tenant')
    CREATE UNIQUE INDEX UQ_Brands_Name_Tenant ON master.Brands(TenantId, BrandName) WHERE IsActive = 1;
GO

-- Genders
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_Genders_Name_Tenant')
    ALTER TABLE master.Genders DROP CONSTRAINT UQ_Genders_Name_Tenant;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='Genders' AND i.name='UQ_Genders_Name_Tenant')
    CREATE UNIQUE INDEX UQ_Genders_Name_Tenant ON master.Genders(TenantId, GenderName) WHERE IsActive = 1;
GO

-- Seasons
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_Seasons_Code_Tenant')
    ALTER TABLE master.Seasons DROP CONSTRAINT UQ_Seasons_Code_Tenant;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='Seasons' AND i.name='UQ_Seasons_Code_Tenant')
    CREATE UNIQUE INDEX UQ_Seasons_Code_Tenant ON master.Seasons(TenantId, SeasonCode) WHERE IsActive = 1;
GO

-- Segments
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_Segments_Name_Tenant')
    ALTER TABLE master.Segments DROP CONSTRAINT UQ_Segments_Name_Tenant;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='Segments' AND i.name='UQ_Segments_Name_Tenant')
    CREATE UNIQUE INDEX UQ_Segments_Name_Tenant ON master.Segments(TenantId, SegmentName) WHERE IsActive = 1;
GO

-- SubSegments
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_SubSegments_Name_Segment')
    ALTER TABLE master.SubSegments DROP CONSTRAINT UQ_SubSegments_Name_Segment;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='SubSegments' AND i.name='UQ_SubSegments_Name_Segment')
    CREATE UNIQUE INDEX UQ_SubSegments_Name_Segment ON master.SubSegments(SegmentId, SubSegmentName) WHERE IsActive = 1;
GO

-- Categories
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_Categories_Name_Tenant')
    ALTER TABLE master.Categories DROP CONSTRAINT UQ_Categories_Name_Tenant;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='Categories' AND i.name='UQ_Categories_Name_Tenant')
    CREATE UNIQUE INDEX UQ_Categories_Name_Tenant ON master.Categories(TenantId, CategoryName) WHERE IsActive = 1;
GO

-- SubCategories
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_SubCategories_Name_Cat')
    ALTER TABLE master.SubCategories DROP CONSTRAINT UQ_SubCategories_Name_Cat;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='SubCategories' AND i.name='UQ_SubCategories_Name_Cat')
    CREATE UNIQUE INDEX UQ_SubCategories_Name_Cat ON master.SubCategories(CategoryId, SubCategoryName) WHERE IsActive = 1;
GO

-- Groups
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name='UQ_Groups_Name_Tenant')
    ALTER TABLE master.Groups DROP CONSTRAINT UQ_Groups_Name_Tenant;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id JOIN sys.schemas s ON t.schema_id=s.schema_id WHERE s.name='master' AND t.name='Groups' AND i.name='UQ_Groups_Name_Tenant')
    CREATE UNIQUE INDEX UQ_Groups_Name_Tenant ON master.Groups(TenantId, GroupName) WHERE IsActive = 1;
GO

PRINT 'Soft-delete unique constraints fixed successfully.';
GO
