namespace RetailERP.Billing.Application.Utilities;

/// <summary>
/// Converts a decimal amount to Indian number words format.
/// Example: 524815.31 => "FIVE LAKHS TWENTY FOUR THOUSAND EIGHT HUNDRED FIFTEEN RUPEES AND THIRTY ONE PAISE ONLY"
/// Supports up to 99,99,99,99,999 (99 arab / 9999 crore).
/// </summary>
public static class NumberToWordsConverter
{
    private static readonly string[] Ones =
    {
        "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
        "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
        "SEVENTEEN", "EIGHTEEN", "NINETEEN"
    };

    private static readonly string[] Tens =
    {
        "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
    };

    /// <summary>
    /// Converts a decimal amount to Indian currency words.
    /// Returns format: "FIVE LAKHS TWENTY FOUR THOUSAND EIGHT HUNDRED FIFTEEN RUPEES AND THIRTY ONE PAISE ONLY"
    /// </summary>
    public static string NumberToWordsIndian(decimal amount)
    {
        if (amount < 0)
            return "MINUS " + NumberToWordsIndian(Math.Abs(amount));

        if (amount == 0)
            return "ZERO RUPEES ONLY";

        // Separate rupees and paise
        var rupees = (long)Math.Truncate(amount);
        var paiseDecimal = Math.Round((amount - rupees) * 100, 0);
        var paise = (int)paiseDecimal;

        var result = string.Empty;

        if (rupees > 0)
        {
            result = ConvertWholeNumberIndian(rupees) + " RUPEES";
        }

        if (paise > 0)
        {
            if (rupees > 0)
                result += " AND ";
            result += ConvertBelowHundred(paise) + " PAISE";
        }

        if (string.IsNullOrEmpty(result))
            result = "ZERO RUPEES";

        return result + " ONLY";
    }

    /// <summary>
    /// Converts a whole number to Indian grouping words.
    /// Indian grouping: units, thousands, lakhs, crores, arab, kharab
    /// Pattern: last 3 digits, then groups of 2 digits from right.
    /// </summary>
    private static string ConvertWholeNumberIndian(long number)
    {
        if (number == 0) return "ZERO";
        if (number < 0) return "MINUS " + ConvertWholeNumberIndian(Math.Abs(number));

        var parts = new List<string>();

        // Kharab (10^11) - groups above crore continue in pairs
        if (number >= 10_00_00_00_000L)
        {
            var kharab = number / 10_00_00_00_000L;
            parts.Add(ConvertBelowHundred((int)kharab) + " KHARAB");
            number %= 10_00_00_00_000L;
        }

        // Arab (10^9)
        if (number >= 1_00_00_00_000L)
        {
            var arab = number / 1_00_00_00_000L;
            parts.Add(ConvertBelowHundred((int)arab) + " ARAB");
            number %= 1_00_00_00_000L;
        }

        // Crore (10^7)
        if (number >= 1_00_00_000L)
        {
            var crore = number / 1_00_00_000L;
            parts.Add(ConvertBelowHundred((int)crore) + " CRORES");
            number %= 1_00_00_000L;
        }

        // Lakh (10^5)
        if (number >= 1_00_000L)
        {
            var lakh = number / 1_00_000L;
            parts.Add(ConvertBelowHundred((int)lakh) + " LAKHS");
            number %= 1_00_000L;
        }

        // Thousand (10^3)
        if (number >= 1_000L)
        {
            var thousand = number / 1_000L;
            parts.Add(ConvertBelowHundred((int)thousand) + " THOUSAND");
            number %= 1_000L;
        }

        // Hundred
        if (number >= 100L)
        {
            var hundred = number / 100L;
            parts.Add(Ones[hundred] + " HUNDRED");
            number %= 100L;
        }

        // Remaining (0-99)
        if (number > 0)
        {
            parts.Add(ConvertBelowHundred((int)number));
        }

        return string.Join(" ", parts);
    }

    private static string ConvertBelowHundred(int number)
    {
        if (number < 20)
            return Ones[number];

        var ten = number / 10;
        var one = number % 10;

        if (one == 0)
            return Tens[ten];

        return Tens[ten] + " " + Ones[one];
    }
}
