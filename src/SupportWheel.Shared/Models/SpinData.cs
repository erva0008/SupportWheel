namespace SupportWheel.Shared.Models;

/// <summary>
/// Represents a spin result: the items in play and which were selected.
/// </summary>
public sealed record SpinData
{
    /// <summary>All items that participated in the spin.</summary>
    public required string[] Items { get; init; }

    /// <summary>Indices into Items of the selected winners.</summary>
    public required int[] SelectedIndices { get; init; }

    /// <summary>
    /// Indices into Items in the order they were drawn (reveal order for sequential mode).
    /// Null for non-sequential spins or backward-compatible old links.
    /// </summary>
    public int[]? RevealOrderIndices { get; init; }

    /// <summary>Number of items to select.</summary>
    public int Count => SelectedIndices.Length;

    /// <summary>The selected item names (derived from Items + SelectedIndices).</summary>
    public string[] Selected => SelectedIndices.Select(i => Items[i]).ToArray();
}
