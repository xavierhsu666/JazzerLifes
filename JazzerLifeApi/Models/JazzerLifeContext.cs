using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace JazzerLifeApi.Models;

public partial class JazzerLifeContext : DbContext
{
    public JazzerLifeContext()
    {
    }

    public JazzerLifeContext(DbContextOptions<JazzerLifeContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AccountCategory> AccountCategories { get; set; }

    public virtual DbSet<BankAccount> BankAccounts { get; set; }

    public virtual DbSet<Bill> Bills { get; set; }

    public virtual DbSet<BluepictureDraft> BluepictureDrafts { get; set; }

    public virtual DbSet<Detail> Details { get; set; }

    public virtual DbSet<EconAlertLog> EconAlertLogs { get; set; }

    public virtual DbSet<EconAlertRule> EconAlertRules { get; set; }

    public virtual DbSet<EconIndicator> EconIndicators { get; set; }

    public virtual DbSet<EconIndicatorValue> EconIndicatorValues { get; set; }

    public virtual DbSet<FuelConsumption> FuelConsumptions { get; set; }

    public virtual DbSet<MaintenanceCycle> MaintenanceCycles { get; set; }

    public virtual DbSet<MaintenanceShop> MaintenanceShops { get; set; }

    public virtual DbSet<PartCategory> PartCategories { get; set; }

    public virtual DbSet<PartsMaintenance> PartsMaintenances { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<ProjectAssetBinding> ProjectAssetBindings { get; set; }

    public virtual DbSet<ProjectCashflowRule> ProjectCashflowRules { get; set; }

    public virtual DbSet<ProjectExpectedDraft> ProjectExpectedDrafts { get; set; }

    public virtual DbSet<ProjectExpectedRow> ProjectExpectedRows { get; set; }

    public virtual DbSet<Stock> Stocks { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Vehicle> Vehicles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AccountCategory>(entity =>
        {
            entity.HasKey(e => e.AccountCategoryId);

            entity.ToTable("AccountCategory", "FIN");

            entity.HasIndex(e => new { e.UserId, e.OrganizationName, e.AccountName }, "UQ_AccountCategory_UserOrgAccount").IsUnique();

            entity.HasIndex(e => new { e.UserId, e.Category }, "IX_AccountCategory_UserCategory");

            entity.Property(e => e.AccountCategoryId).HasColumnName("AccountCategoryID");
            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.OrganizationName).HasMaxLength(100);
            entity.Property(e => e.AccountName).HasMaxLength(100);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
        });

        modelBuilder.Entity<BankAccount>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("BankAccount", "FIN");

            entity.Property(e => e.AccountBalance).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.AccountName).HasMaxLength(100);
            entity.Property(e => e.Activate).HasMaxLength(50);
            entity.Property(e => e.AvailableCredit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.CreditLimit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.OrganizationName).HasMaxLength(100);
            entity.Property(e => e.Tag).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<Bill>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("Bill", "FIN");

            entity.Property(e => e.Activate).HasMaxLength(1);
            entity.Property(e => e.BillAmount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.BillEndTime).HasColumnType("datetime");
            entity.Property(e => e.BillStartTime).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.Note).HasMaxLength(1);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<BluepictureDraft>(entity =>
        {
            entity.HasKey(e => e.DraftId).HasName("PK__Bluepict__3E93D65B7234B346");

            entity.ToTable("Bluepicture_Draft", "FIN");

            entity.Property(e => e.Activate).HasMaxLength(50);
            entity.Property(e => e.BEnd)
                .HasMaxLength(100)
                .HasColumnName("bEnd");
            entity.Property(e => e.BStart)
                .HasMaxLength(100)
                .HasColumnName("bStart");
            entity.Property(e => e.BTimeBase)
                .HasMaxLength(100)
                .HasColumnName("bTimeBase");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.InflationRatio)
                .HasColumnType("decimal(5, 2)")
                .HasColumnName("inflationRatio");
            entity.Property(e => e.InitCapital)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("initCapital");
            entity.Property(e => e.MonthlyInput)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("monthlyInput");
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.RewardRatio)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("rewardRatio");
            entity.Property(e => e.Type).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<Detail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__Detail__135C314D359E9B83");

            entity.ToTable("Detail", "FIN");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.AccountName).HasMaxLength(100);
            entity.Property(e => e.Activate).HasMaxLength(50);
            entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(255);
            entity.Property(e => e.OrganizationName).HasMaxLength(100);
            entity.Property(e => e.Tag).HasMaxLength(50);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<EconIndicator>(entity =>
        {
            entity.HasKey(e => e.IndicatorId);

            entity.ToTable("EconIndicator", "MACRO");

            entity.HasIndex(e => e.Code, "UQ_EconIndicator_Code").IsUnique();

            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Country).HasMaxLength(10);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.Unit).HasMaxLength(20);
            entity.Property(e => e.Source).HasMaxLength(50);
            entity.Property(e => e.SourceSeriesId).HasMaxLength(50);
            entity.Property(e => e.Frequency).HasMaxLength(20);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
        });

        modelBuilder.Entity<EconIndicatorValue>(entity =>
        {
            entity.HasKey(e => e.ValueId);

            entity.ToTable("EconIndicatorValue", "MACRO");

            entity.HasIndex(e => new { e.IndicatorId, e.PeriodDate }, "UQ_EconIndicatorValue_IndicatorPeriod").IsUnique();

            entity.Property(e => e.Value).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Indicator).WithMany(p => p.EconIndicatorValues)
                .HasForeignKey(d => d.IndicatorId)
                .HasConstraintName("FK_EconIndicatorValue_Indicator");
        });

        modelBuilder.Entity<EconAlertRule>(entity =>
        {
            entity.HasKey(e => e.RuleId);

            entity.ToTable("EconAlertRule", "MACRO");

            entity.HasIndex(e => e.UserId, "IX_EconAlertRule_UserId");

            entity.Property(e => e.Operator).HasMaxLength(5);
            entity.Property(e => e.Threshold).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Indicator).WithMany(p => p.EconAlertRules)
                .HasForeignKey(d => d.IndicatorId)
                .HasConstraintName("FK_EconAlertRule_Indicator");

            entity.HasOne(d => d.User).WithMany(p => p.EconAlertRules)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_EconAlertRule_User");
        });

        modelBuilder.Entity<EconAlertLog>(entity =>
        {
            entity.HasKey(e => e.LogId);

            entity.ToTable("EconAlertLog", "MACRO");

            entity.HasIndex(e => e.RuleId, "IX_EconAlertLog_RuleId");

            entity.Property(e => e.Value).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.Message).HasMaxLength(255);
            entity.Property(e => e.TriggeredAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.IsRead).HasDefaultValue(false);

            entity.HasOne(d => d.Rule).WithMany(p => p.EconAlertLogs)
                .HasForeignKey(d => d.RuleId)
                .HasConstraintName("FK_EconAlertLog_Rule");
        });

        modelBuilder.Entity<FuelConsumption>(entity =>
        {
            entity.HasKey(e => e.RecordId).HasName("PK__FuelCons__FBDF78C98FE0E680");

            entity.ToTable("FuelConsumption", "CarMan");

            entity.Property(e => e.RecordId).HasColumnName("RecordID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.DistanceTravelled).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FuelAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FuelCost).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.FuelEfficiency).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.OdometerReading).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.VehicleId).HasColumnName("VehicleID");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.FuelConsumptions)
                .HasForeignKey(d => d.VehicleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__FuelConsu__Vehic__6EF57B66");
        });

        modelBuilder.Entity<MaintenanceCycle>(entity =>
        {
            entity.HasKey(e => e.CycleId).HasName("PK__Maintena__077B24D96502B793");

            entity.ToTable("MaintenanceCycles", "CarMan");

            entity.Property(e => e.CycleId).HasColumnName("CycleID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.MileageCycle).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.PartName).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.VehicleId).HasColumnName("VehicleID");

            entity.HasOne(d => d.User).WithMany(p => p.MaintenanceCycles)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Maintenan__UserI__05D8E0BE");
        });

        modelBuilder.Entity<MaintenanceShop>(entity =>
        {
            entity.HasKey(e => e.ShopId).HasName("PK__Maintena__67C556298810A38C");

            entity.ToTable("MaintenanceShops", "CarMan");

            entity.Property(e => e.ShopId).HasColumnName("ShopID");
            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.ContactPerson).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.PhoneNumber).HasMaxLength(15);
            entity.Property(e => e.ShopName).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.MaintenanceShops)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Maintenan__UserI__01142BA1");
        });

        modelBuilder.Entity<PartCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PK__PartCate__19093A2B2741E4D3");

            entity.ToTable("PartCategories", "CarMan");

            entity.Property(e => e.CategoryId).HasColumnName("CategoryID");
            entity.Property(e => e.CategoryName).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.PartCategories)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__PartCateg__UserI__5DCAEF64");
        });

        modelBuilder.Entity<PartsMaintenance>(entity =>
        {
            entity.HasKey(e => e.MaintenanceId).HasName("PK__PartsMai__E60542B56B40CD6B");

            entity.ToTable("PartsMaintenance", "CarMan");

            entity.Property(e => e.MaintenanceId).HasColumnName("MaintenanceID");
            entity.Property(e => e.CategoryId).HasColumnName("CategoryID");
            entity.Property(e => e.Cost).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(255);
            entity.Property(e => e.OdometerReading).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.PartName).HasMaxLength(100);
            entity.Property(e => e.Store).IsUnicode(false);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.VehicleId).HasColumnName("VehicleID");

            entity.HasOne(d => d.Category).WithMany(p => p.PartsMaintenances)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK__PartsMain__Categ__7C4F7684");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.PartsMaintenances)
                .HasForeignKey(d => d.VehicleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__PartsMain__Vehic__7B5B524B");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.ProjectId).HasName("PK__Projects__761ABEF0BAFA079D");

            entity.ToTable("Projects", "FIN");

            entity.Property(e => e.Activate).HasMaxLength(1);
            entity.Property(e => e.BillBudget).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.BillEndTime).HasColumnType("datetime");
            entity.Property(e => e.BillStartTime).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.Note).HasMaxLength(1);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("進行中");
            entity.Property(e => e.TagPrefix).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<ProjectAssetBinding>(entity =>
        {
            entity.HasKey(e => e.BindingId).HasName("PK__ProjectA__C9F44A228BCBCC45");

            entity.ToTable("ProjectAssetBinding", "FIN");

            entity.HasIndex(e => new { e.ProjectId, e.SnapshotMonth }, "IX_ProjectAssetBinding_ProjectMonth");

            entity.HasIndex(e => new { e.ProjectId, e.SnapshotMonth, e.OrganizationName, e.AccountName }, "UQ_ProjectAssetBinding").IsUnique();

            entity.Property(e => e.BindingId).HasColumnName("BindingID");
            entity.Property(e => e.AccountName).HasMaxLength(100);
            entity.Property(e => e.Activate).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.OrganizationName).HasMaxLength(100);
            entity.Property(e => e.SnapshotMonth)
                .HasMaxLength(7)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectAssetBindings)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("FK_ProjectAssetBinding_Project");
        });

        modelBuilder.Entity<ProjectCashflowRule>(entity =>
        {
            entity.HasKey(e => e.RuleId).HasName("PK__ProjectC__110458C2B134E9F2");

            entity.ToTable("ProjectCashflowRule", "FIN");

            entity.HasIndex(e => e.ProjectId, "IX_ProjectCashflowRule_ProjectId");

            entity.Property(e => e.RuleId).HasColumnName("RuleID");
            entity.Property(e => e.Activate).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Keyword).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectCashflowRules)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("FK_ProjectCashflowRule_Project");
        });

        modelBuilder.Entity<ProjectExpectedDraft>(entity =>
        {
            entity.HasKey(e => e.DraftId).HasName("PK__ProjectE__3E93D65BBC487D64");

            entity.ToTable("ProjectExpectedDraft", "FIN");

            entity.HasIndex(e => e.ProjectId, "UQ_ProjectExpectedDraft_Project").IsUnique();

            entity.Property(e => e.AnnualInflowRate).HasColumnType("decimal(9, 4)");
            entity.Property(e => e.AnnualOutflowRate).HasColumnType("decimal(9, 4)");
            entity.Property(e => e.BaseAsset).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.BaseMonth)
                .HasMaxLength(7)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Project).WithOne(p => p.ProjectExpectedDraft)
                .HasForeignKey<ProjectExpectedDraft>(d => d.ProjectId)
                .HasConstraintName("FK_ProjectExpectedDraft_Project");
        });

        modelBuilder.Entity<ProjectExpectedRow>(entity =>
        {
            entity.HasKey(e => e.RowId).HasName("PK__ProjectE__FFEE7431DEAADBDD");

            entity.ToTable("ProjectExpectedRow", "FIN");

            entity.HasIndex(e => new { e.DraftId, e.Month }, "UQ_ProjectExpectedRow").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Inflow).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ManualFlow).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Month)
                .HasMaxLength(7)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.Outflow).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Draft).WithMany(p => p.ProjectExpectedRows)
                .HasForeignKey(d => d.DraftId)
                .HasConstraintName("FK_ProjectExpectedRow_Draft");
        });

        modelBuilder.Entity<Stock>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("Stock", "FIN");

            entity.Property(e => e.AccountName).HasMaxLength(100);
            entity.Property(e => e.Activate).HasMaxLength(50);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Cost).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.MarketValue).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.OrganizationName).HasMaxLength(100);
            entity.Property(e => e.UnRealizedBenefit).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.UnRealizedBenefitRatio).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CCAC5A21B2C3");

            entity.ToTable("Users", "MEM");

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534E2B6DF1D").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.Birthday).HasColumnType("datetime");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasMaxLength(15);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserName).HasMaxLength(100);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(e => e.VehicleId).HasName("PK__Vehicles__476B54B215B1EA84");

            entity.ToTable("Vehicles", "CarMan");

            entity.HasIndex(e => e.LicensePlate, "UQ__Vehicles__026BC15C81598BB0").IsUnique();

            entity.Property(e => e.VehicleId).HasColumnName("VehicleID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.LicensePlate).HasMaxLength(20);
            entity.Property(e => e.Make).HasMaxLength(50);
            entity.Property(e => e.Model).HasMaxLength(50);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.Vehicles)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Vehicles__UserID__6383C8BA");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
