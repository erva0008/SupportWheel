using SupportWheel.Shared.Services;

namespace SupportWheel.Client.Tests;

public class WheelSpinnerTests
{
    private static readonly string[] SampleItems = ["Anna", "Bo", "Clara", "David", "Eva"];

    [Fact]
    public void Spin_ReturnsExactlyCountSelectedItems()
    {
        var result = WheelSpinner.Spin(SampleItems, 3);

        Assert.Equal(3, result.Count);
        Assert.Equal(3, result.SelectedIndices.Length);
        Assert.Equal(3, result.Selected.Length);
    }

    [Fact]
    public void Spin_AllSelectedItemsExistInOriginalList_NoDuplicates()
    {
        var result = WheelSpinner.Spin(SampleItems, 3);

        Assert.All(result.Selected, item => Assert.Contains(item, SampleItems));
        Assert.Equal(result.Selected.Distinct().Count(), result.Selected.Length);
    }

    [Fact]
    public void Spin_CountEqualsItemsLength_SelectsAll()
    {
        var result = WheelSpinner.Spin(SampleItems, SampleItems.Length);

        Assert.Equal(SampleItems.Length, result.Count);
        Assert.Equal(SampleItems.Order().ToArray(), result.Selected.Order().ToArray());
    }

    [Fact]
    public void Spin_CountEqualsOne_SelectsExactlyOne()
    {
        var result = WheelSpinner.Spin(SampleItems, 1);

        Assert.Single(result.SelectedIndices);
        Assert.Single(result.Selected);
        Assert.Contains(result.Selected[0], SampleItems);
    }

    [Fact]
    public void Spin_CountGreaterThanItemsLength_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => WheelSpinner.Spin(SampleItems, SampleItems.Length + 1));
    }

    [Fact]
    public void Spin_CountZero_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => WheelSpinner.Spin(SampleItems, 0));
    }

    [Fact]
    public void Spin_EmptyItems_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => WheelSpinner.Spin([], 1));
    }

    [Fact]
    public void Spin_WithSeededRandom_ProducesDeterministicResults()
    {
        var result1 = WheelSpinner.Spin(SampleItems, 2, new Random(42));
        var result2 = WheelSpinner.Spin(SampleItems, 2, new Random(42));

        Assert.Equal(result1.SelectedIndices, result2.SelectedIndices);
        Assert.Equal(result1.Selected, result2.Selected);
    }

    [Fact]
    public void Spin_SelectedIndicesAreSortedAscending()
    {
        // Run multiple times to increase confidence
        for (int i = 0; i < 20; i++)
        {
            var result = WheelSpinner.Spin(SampleItems, 3, new Random(i));

            var sorted = result.SelectedIndices.Order().ToArray();
            Assert.Equal(sorted, result.SelectedIndices);
        }
    }

    [Fact]
    public void Spin_ItemsArrayIsPreservedInResult()
    {
        var result = WheelSpinner.Spin(SampleItems, 2);

        Assert.Same(SampleItems, result.Items);
    }

    [Fact]
    public void Spin_RevealOrderIndices_ContainsSameValuesAsSelectedIndices()
    {
        var result = WheelSpinner.Spin(SampleItems, 3, new Random(42));

        Assert.NotNull(result.RevealOrderIndices);
        Assert.Equal(result.SelectedIndices.Length, result.RevealOrderIndices.Length);
        Assert.Equal(
            result.SelectedIndices.Order().ToArray(),
            result.RevealOrderIndices.Order().ToArray());
    }

    [Fact]
    public void Spin_RevealOrderIndices_MayDifferFromSelectedIndicesOrder()
    {
        // Run many seeds until we find one where draw order != sorted order
        bool foundDifferent = false;
        for (int seed = 0; seed < 100; seed++)
        {
            var result = WheelSpinner.Spin(SampleItems, 3, new Random(seed));
            if (!result.RevealOrderIndices!.SequenceEqual(result.SelectedIndices))
            {
                foundDifferent = true;
                break;
            }
        }
        Assert.True(foundDifferent, "RevealOrderIndices should sometimes differ from sorted SelectedIndices");
    }
}
