using SupportWheel.Client.Models;
using SupportWheel.Client.Services;

namespace SupportWheel.Client.Tests;

public class SpinEncoderTests
{
    [Fact]
    public void Encode_Decode_RoundTrip_SimpleItems()
    {
        var original = new SpinData
        {
            Items = ["Anna", "Bo", "Clara"],
            SelectedIndices = [0, 2],
        };

        var encoded = SpinEncoder.Encode(original);
        var decoded = SpinEncoder.Decode(encoded);

        Assert.Equal(original.Items, decoded.Items);
        Assert.Equal(original.SelectedIndices, decoded.SelectedIndices);
    }

    [Fact]
    public void Encode_Decode_RoundTrip_SwedishCharacters()
    {
        var original = new SpinData
        {
            Items = ["Åsa", "Ärling", "Östen"],
            SelectedIndices = [1],
        };

        var encoded = SpinEncoder.Encode(original);
        var decoded = SpinEncoder.Decode(encoded);

        Assert.Equal(original.Items, decoded.Items);
        Assert.Equal(original.SelectedIndices, decoded.SelectedIndices);
    }

    [Fact]
    public void Encode_Decode_RoundTrip_SingleItemSingleSelection()
    {
        var original = new SpinData
        {
            Items = ["Solo"],
            SelectedIndices = [0],
        };

        var encoded = SpinEncoder.Encode(original);
        var decoded = SpinEncoder.Decode(encoded);

        Assert.Equal(original.Items, decoded.Items);
        Assert.Equal(original.SelectedIndices, decoded.SelectedIndices);
    }

    [Fact]
    public void Decode_InvalidBase64_ThrowsFormatException()
    {
        Assert.Throws<FormatException>(() => SpinEncoder.Decode("!!!not-valid-base64!!!"));
    }

    [Fact]
    public void Decode_OutOfBoundsIndex_ThrowsFormatException()
    {
        // Encode valid data, then tamper with the encoded string by creating one with bad index
        var bad = new SpinData
        {
            Items = ["A", "B"],
            SelectedIndices = [0], // valid for encoding
        };

        // Manually craft a payload with out-of-bounds index
        var json = """{"i":["A","B"],"s":[5]}"""u8.ToArray();
        var encoded = Convert.ToBase64String(json).Replace('+', '-').Replace('/', '_').TrimEnd('=');

        Assert.Throws<FormatException>(() => SpinEncoder.Decode(encoded));
    }

    [Fact]
    public void Decode_DuplicateIndices_ThrowsFormatException()
    {
        var json = """{"i":["A","B","C"],"s":[1,1]}"""u8.ToArray();
        var encoded = Convert.ToBase64String(json).Replace('+', '-').Replace('/', '_').TrimEnd('=');

        Assert.Throws<FormatException>(() => SpinEncoder.Decode(encoded));
    }

    [Fact]
    public void Decode_EmptyItems_ThrowsFormatException()
    {
        var json = """{"i":[],"s":[]}"""u8.ToArray();
        var encoded = Convert.ToBase64String(json).Replace('+', '-').Replace('/', '_').TrimEnd('=');

        Assert.Throws<FormatException>(() => SpinEncoder.Decode(encoded));
    }

    [Fact]
    public void Encode_ProducesBase64Url_WithoutPadding()
    {
        var data = new SpinData
        {
            Items = ["Test"],
            SelectedIndices = [0],
        };

        var encoded = SpinEncoder.Encode(data);

        Assert.DoesNotContain("=", encoded);
        Assert.DoesNotContain("+", encoded);
        Assert.DoesNotContain("/", encoded);
    }
}
