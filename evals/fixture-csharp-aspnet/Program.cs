using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<ClinicDb>(options =>
    options.UseSqlite("Data Source=clinic.db"));
var app = builder.Build();

app.MapPost("/slots/{id:int}/book", async (int id, BookRequest request, ClinicDb db) =>
{
    var slot = await db.Slots.FindAsync(id);
    if (slot is null) return Results.NotFound();
    var appointment = new Appointment { SlotId = id, PatientId = request.PatientId };
    db.Appointments.Add(appointment);
    slot.IsBooked = true;
    await db.SaveChangesAsync();
    return Results.Created($"/appointments/{appointment.Id}", appointment.Id);
});

app.Run();
