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
    public static string SwitchToEnglish => GetString(nameof(SwitchToEnglish));
    public static string SwitchToSwedish => GetString(nameof(SwitchToSwedish));

    // Home page
    public static string PageTitleHome => GetString(nameof(PageTitleHome));
    public static string AddYourItems => GetString(nameof(AddYourItems));
    public static string EnterOnePerLine => GetString(nameof(EnterOnePerLine));
    public static string PlaceholderItems => GetString(nameof(PlaceholderItems));
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
    public static string EditItemsButton => GetString(nameof(EditItemsButton));
    public static string NewSpinButton => GetString(nameof(NewSpinButton));
    public static string LinkCopied => GetString(nameof(LinkCopied));

    // Saved wheels
    public static string MyWheels => GetString(nameof(MyWheels));
    public static string NoSavedWheels => GetString(nameof(NoSavedWheels));
    public static string SaveWheel => GetString(nameof(SaveWheel));
    public static string SaveWheelPrompt => GetString(nameof(SaveWheelPrompt));
    public static string LoadWheel => GetString(nameof(LoadWheel));
    public static string DeleteWheel => GetString(nameof(DeleteWheel));
    public static string WheelSaved => GetString(nameof(WheelSaved));
    public static string ItemCount => GetString(nameof(ItemCount));

    // API docs page
    public static string PageTitleApiDocs => GetString(nameof(PageTitleApiDocs));
    public static string ApiDocsLink => GetString(nameof(ApiDocsLink));
    public static string ApiOverviewTitle => GetString(nameof(ApiOverviewTitle));
    public static string ApiOverviewDescription => GetString(nameof(ApiOverviewDescription));
    public static string ApiEndpointTitle => GetString(nameof(ApiEndpointTitle));
    public static string ApiEndpointMethod => GetString(nameof(ApiEndpointMethod));
    public static string ApiEndpointUrl => GetString(nameof(ApiEndpointUrl));
    public static string ApiEndpointAuth => GetString(nameof(ApiEndpointAuth));
    public static string ApiEndpointAuthValue => GetString(nameof(ApiEndpointAuthValue));
    public static string ApiEndpointContentType => GetString(nameof(ApiEndpointContentType));
    public static string ApiRequestTitle => GetString(nameof(ApiRequestTitle));
    public static string ApiFieldName => GetString(nameof(ApiFieldName));
    public static string ApiFieldType => GetString(nameof(ApiFieldType));
    public static string ApiFieldRequired => GetString(nameof(ApiFieldRequired));
    public static string ApiFieldDescription => GetString(nameof(ApiFieldDescription));
    public static string ApiFieldItemsDesc => GetString(nameof(ApiFieldItemsDesc));
    public static string ApiFieldCountDesc => GetString(nameof(ApiFieldCountDesc));
    public static string ApiFieldBaseUrlDesc => GetString(nameof(ApiFieldBaseUrlDesc));
    public static string ApiYes => GetString(nameof(ApiYes));
    public static string ApiNo => GetString(nameof(ApiNo));
    public static string ApiResponseTitle => GetString(nameof(ApiResponseTitle));
    public static string ApiResponseSuccess => GetString(nameof(ApiResponseSuccess));
    public static string ApiResponseError => GetString(nameof(ApiResponseError));
    public static string ApiExamplesTitle => GetString(nameof(ApiExamplesTitle));
    public static string ApiNotesTitle => GetString(nameof(ApiNotesTitle));
    public static string ApiNote1 => GetString(nameof(ApiNote1));
    public static string ApiNote2 => GetString(nameof(ApiNote2));
    public static string ApiNote3 => GetString(nameof(ApiNote3));
    public static string ApiBackToWheel => GetString(nameof(ApiBackToWheel));
}
