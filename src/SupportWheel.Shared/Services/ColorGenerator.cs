using System.Globalization;

namespace SupportWheel.Shared.Services;

/// <summary>
/// Generates HSL colors using the golden angle distribution,
/// matching the JavaScript wheel-canvas.js _generateColors algorithm.
/// </summary>
public static class ColorGenerator
{
    private const double GoldenAngle = 137.508;

    public static string[] GenerateColors(int count)
    {
        var colors = new string[count];
        for (int i = 0; i < count; i++)
        {
            var hue = (i * GoldenAngle) % 360;
            colors[i] = string.Create(CultureInfo.InvariantCulture, $"hsl({hue:F1}, 68%, 58%)");
        }
        return colors;
    }
}
