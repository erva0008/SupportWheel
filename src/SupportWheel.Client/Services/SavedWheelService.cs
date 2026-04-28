using System.Text.Json;
using Microsoft.JSInterop;
using SupportWheel.Client.Models;

namespace SupportWheel.Client.Services;

public class SavedWheelService(IJSRuntime js)
{
    private const string StorageKey = "supportwheel-saved-wheels";
    private const int MaxWheels = 25;

    public async Task<List<SavedWheel>> GetAllAsync()
    {
        try
        {
            var json = await js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
            if (string.IsNullOrEmpty(json))
                return [];

            return JsonSerializer.Deserialize<List<SavedWheel>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public async Task SaveAsync(SavedWheel wheel)
    {
        var wheels = await GetAllAsync();
        wheels.Add(wheel);

        // Cap at max, remove oldest first
        if (wheels.Count > MaxWheels)
        {
            wheels = [.. wheels.OrderByDescending(w => w.CreatedAt).Take(MaxWheels)];
        }

        var json = JsonSerializer.Serialize(wheels);
        await js.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
    }

    public async Task DeleteAsync(string id)
    {
        var wheels = await GetAllAsync();
        wheels.RemoveAll(w => w.Id == id);

        var json = JsonSerializer.Serialize(wheels);
        await js.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
    }
}
