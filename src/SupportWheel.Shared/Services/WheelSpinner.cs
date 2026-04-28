using SupportWheel.Shared.Models;

namespace SupportWheel.Shared.Services;

/// <summary>
/// Selects N random items from a list without replacement using Fisher-Yates shuffle.
/// </summary>
public static class WheelSpinner
{
    /// <summary>
    /// Randomly selects <paramref name="count"/> items from <paramref name="items"/>.
    /// Returns a <see cref="SpinData"/> with the items and selected indices.
    /// </summary>
    /// <exception cref="ArgumentException">If count &gt; items.Length or count &lt; 1 or items is empty.</exception>
    public static SpinData Spin(string[] items, int count, Random? random = null)
    {
        ArgumentNullException.ThrowIfNull(items);

        if (items.Length == 0)
            throw new ArgumentException("Items must not be empty.", nameof(items));

        if (count < 1)
            throw new ArgumentException("Count must be at least 1.", nameof(count));

        if (count > items.Length)
            throw new ArgumentException($"Count ({count}) exceeds items length ({items.Length}).", nameof(count));

        random ??= Random.Shared;

        // Fisher-Yates shuffle on indices, take first `count`
        var indices = Enumerable.Range(0, items.Length).ToArray();

        for (int i = indices.Length - 1; i > 0; i--)
        {
            int j = random.Next(i + 1);
            (indices[i], indices[j]) = (indices[j], indices[i]);
        }

        var selected = indices[..count];
        var revealOrder = selected.ToArray(); // Preserve draw order BEFORE sorting
        Array.Sort(selected); // Sort ascending for consistent display order

        return new SpinData
        {
            Items = items,
            SelectedIndices = selected,
            RevealOrderIndices = revealOrder,
        };
    }
}
