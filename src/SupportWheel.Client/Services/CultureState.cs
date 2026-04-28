namespace SupportWheel.Client.Services;

public class CultureState
{
    public event Action? OnCultureChanged;

    public void NotifyCultureChanged() => OnCultureChanged?.Invoke();
}
