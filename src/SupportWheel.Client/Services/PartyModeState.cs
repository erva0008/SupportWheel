namespace SupportWheel.Client.Services;

/// <summary>
/// Manages party mode state (enabled/intensity) with localStorage persistence.
/// Pattern mirrors CultureState — event-driven, singleton service.
/// </summary>
public class PartyModeState
{
    public bool Enabled { get; private set; }
    public int Intensity { get; private set; } = 1;
    public bool ReducedMotion { get; private set; }

    /// <summary>
    /// Effective intensity accounting for reduced-motion preference.
    /// Returns 0 if disabled or reduced-motion is active.
    /// </summary>
    public int EffectiveIntensity => Enabled && !ReducedMotion ? Intensity : 0;

    public event Action? OnChanged;

    public void SetEnabled(bool enabled)
    {
        Enabled = enabled;
        OnChanged?.Invoke();
    }

    public void SetIntensity(int intensity)
    {
        Intensity = Math.Clamp(intensity, 1, 3);
        OnChanged?.Invoke();
    }

    public void SetReducedMotion(bool reduced)
    {
        ReducedMotion = reduced;
        OnChanged?.Invoke();
    }

    public void Load(bool enabled, int intensity, bool reducedMotion)
    {
        Enabled = enabled;
        Intensity = Math.Clamp(intensity, 1, 3);
        ReducedMotion = reducedMotion;
        OnChanged?.Invoke();
    }
}
