using System.Text.Json;
using System.Text.Json.Serialization;
using SupportWheel.Shared.Models;

namespace SupportWheel.Shared.Services;

/// <summary>
/// Encodes/decodes <see cref="SpinData"/> to/from base64url for URL state.
/// </summary>
public static class SpinEncoder
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = null,
    };

    /// <summary>
    /// Encodes a <see cref="SpinData"/> into a base64url string.
    /// </summary>
    public static string Encode(SpinData data)
    {
        ArgumentNullException.ThrowIfNull(data);

        var dto = new SpinDto { I = data.Items, S = data.SelectedIndices, R = data.RevealOrderIndices };
        var json = JsonSerializer.SerializeToUtf8Bytes(dto, JsonOptions);
        return ToBase64Url(json);
    }

    /// <summary>
    /// Decodes a base64url string back into a <see cref="SpinData"/>.
    /// </summary>
    /// <exception cref="FormatException">If the data is invalid or corrupt.</exception>
    public static SpinData Decode(string encoded)
    {
        ArgumentNullException.ThrowIfNull(encoded);

        byte[] bytes;
        try
        {
            bytes = FromBase64Url(encoded);
        }
        catch (Exception ex) when (ex is not FormatException)
        {
            throw new FormatException("Invalid base64url encoding.", ex);
        }

        SpinDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<SpinDto>(bytes, JsonOptions);
        }
        catch (JsonException ex)
        {
            throw new FormatException("Invalid JSON payload.", ex);
        }

        if (dto is null || dto.I is null || dto.S is null)
            throw new FormatException("Missing required fields in spin data.");

        if (dto.I.Length == 0)
            throw new FormatException("Items array must not be empty.");

        if (dto.S.Length == 0)
            throw new FormatException("Selected indices array must not be empty.");

        // Validate indices are within bounds
        for (int j = 0; j < dto.S.Length; j++)
        {
            int index = dto.S[j];
            if (index < 0 || index >= dto.I.Length)
                throw new FormatException($"Selected index {index} is out of bounds (items count: {dto.I.Length}).");
        }

        // Validate no duplicate indices
        var seen = new HashSet<int>();
        for (int j = 0; j < dto.S.Length; j++)
        {
            if (!seen.Add(dto.S[j]))
                throw new FormatException($"Duplicate selected index: {dto.S[j]}.");
        }

        // RevealOrderIndices is optional — old links won't have it
        int[]? revealOrder = dto.R;
        if (revealOrder is not null)
        {
            if (revealOrder.Length != dto.S.Length)
                throw new FormatException("RevealOrderIndices length must match SelectedIndices length.");

            var revealSet = new HashSet<int>(revealOrder);
            var selectedSet = new HashSet<int>(dto.S);
            if (!revealSet.SetEquals(selectedSet))
                throw new FormatException("RevealOrderIndices must contain the same values as SelectedIndices.");
        }

        return new SpinData
        {
            Items = dto.I,
            SelectedIndices = dto.S,
            RevealOrderIndices = revealOrder,
        };
    }

    private static string ToBase64Url(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static byte[] FromBase64Url(string base64Url)
    {
        var base64 = base64Url
            .Replace('-', '+')
            .Replace('_', '/');

        // Re-add padding
        switch (base64.Length % 4)
        {
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }

        return Convert.FromBase64String(base64);
    }

    /// <summary>
    /// Internal DTO with compact keys to minimize URL length.
    /// </summary>
    private sealed class SpinDto
    {
        [JsonPropertyName("i")]
        public string[]? I { get; set; }

        [JsonPropertyName("s")]
        public int[]? S { get; set; }

        [JsonPropertyName("r")]
        public int[]? R { get; set; }
    }
}
