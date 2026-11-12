public class Slot
{
    public int Id { get; set; }
    public string ClinicianId { get; set; } = "";
    public DateTime StartsAt { get; set; }
    public bool IsBooked { get; set; }
}
