namespace SupportWheel.Client.Models;

/// <summary>
/// Represents a spin result: the items in play and which were selected.
/// </summary>
public sealed record SpinData
{
    /// <summary>All items that participated in the spin.</summary>
    public required string[] Items { get; init; }

    /// <summary>Indices into Items of the selected winners.</summary>
    public required int[] SelectedIndices { get; init; }

    /// <summary>Number of items to select.</summary>
    public int Count => SelectedIndices.Length;

    /// <summary>The selected item names (derived from Items + SelectedIndices).</summary>
    public string[] Selected => SelectedIndices.Select(i => Items[i]).ToArray();
}
