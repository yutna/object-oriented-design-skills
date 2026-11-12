using Microsoft.EntityFrameworkCore;

public class ClinicDb(DbContextOptions<ClinicDb> options) : DbContext(options)
{
    public DbSet<Slot> Slots => Set<Slot>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
}
