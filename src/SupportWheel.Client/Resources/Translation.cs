using System.Globalization;
using System.Resources;

namespace SupportWheel.Client.Resources;

/// <summary>
/// Strongly-typed access to localized UI strings. Default culture is Swedish.
/// Uses ResourceManager under the hood — resolves based on CultureInfo.CurrentUICulture.
/// </summary>
public static class Translation
{
    private static readonly ResourceManager ResourceManager =
        new("SupportWheel.Client.Resources.Translation", typeof(Translation).Assembly);

    private static string GetString(string name) =>
        ResourceManager.GetString(name, CultureInfo.CurrentUICulture) ?? name;

    // Layout
    public static string AppTitle => GetString(nameof(AppTitle));

    // Home page
    public static string PageTitleHome => GetString(nameof(PageTitleHome));
    public static string AddYourItems => GetString(nameof(AddYourItems));
    public static string EnterOnePerLine => GetString(nameof(EnterOnePerLine));
    public static string PlaceholderNames => GetString(nameof(PlaceholderNames));
    public static string DuplicateWarning => GetString(nameof(DuplicateWarning));
    public static string HowManyToPick => GetString(nameof(HowManyToPick));
    public static string ErrorMinItems => GetString(nameof(ErrorMinItems));
    public static string ErrorPickCount => GetString(nameof(ErrorPickCount));
    public static string ErrorDuplicates => GetString(nameof(ErrorDuplicates));
    public static string SpinButton => GetString(nameof(SpinButton));
    public static string ItemsEntered => GetString(nameof(ItemsEntered));
    public static string OneAtATime => GetString(nameof(OneAtATime));

    // SpinResult page
    public static string PageTitleResult => GetString(nameof(PageTitleResult));
    public static string InvalidLink => GetString(nameof(InvalidLink));
    public static string LinkCorrupt => GetString(nameof(LinkCorrupt));
    public static string CreateNewSpin => GetString(nameof(CreateNewSpin));
    public static string RoundLabel => GetString(nameof(RoundLabel));
    public static string OfLabel => GetString(nameof(OfLabel));
    public static string AlreadyPicked => GetString(nameof(AlreadyPicked));
    public static string RoundWinner => GetString(nameof(RoundWinner));
    public static string NextRound => GetString(nameof(NextRound));
    public static string Selected => GetString(nameof(Selected));
    public static string CopyLinkButton => GetString(nameof(CopyLinkButton));
    public static string SpinAgainButton => GetString(nameof(SpinAgainButton));
    public static string EditNamesButton => GetString(nameof(EditNamesButton));
    public static string NewSpinButton => GetString(nameof(NewSpinButton));
    public static string LinkCopied => GetString(nameof(LinkCopied));
}
