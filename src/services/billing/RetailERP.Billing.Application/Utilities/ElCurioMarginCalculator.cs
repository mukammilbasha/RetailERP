namespace RetailERP.Billing.Application.Utilities;

/// <summary>
/// Implements the EL CURIO margin formula for GST-compliant invoice calculations.
///
/// Formula:
///   Margin Value        = MRP x Margin%
///   GST Payable %       = IF(MRP &lt;= 2625, 5%, 18%)
///   GST Payable Value   = MRP x GST% / (GST% + 1)
///   Billing Excl GST    = MRP - Margin Value - GST Payable Value
///   GST Reimbursement % = IF(Billing Excl &lt;= 2500, 5%, 18%)
///   GST Reimbursement   = Billing Excl x GST Reimbursement %
///   Billing Incl GST    = Billing Excl + GST Reimbursement
/// </summary>
public static class ElCurioMarginCalculator
{
    /// <summary>
    /// Calculates all EL CURIO margin fields for a single line item.
    /// All monetary values are per-unit; multiply by quantity for line totals.
    /// </summary>
    /// <param name="mrp">Maximum Retail Price per unit (inclusive of all taxes).</param>
    /// <param name="marginPercent">Margin percentage (e.g. 30 for 30%).</param>
    /// <param name="quantity">Number of units.</param>
    /// <returns>A result record containing all calculated fields.</returns>
    public static ElCurioLineResult CalculateElCurioLineItem(decimal mrp, decimal marginPercent, int quantity)
    {
        if (mrp < 0)
            throw new ArgumentException("MRP must not be negative.", nameof(mrp));
        if (marginPercent < 0 || marginPercent > 100)
            throw new ArgumentException("Margin percent must be between 0 and 100.", nameof(marginPercent));
        if (quantity <= 0)
            throw new ArgumentException("Quantity must be a positive integer.", nameof(quantity));

        // Step 1: Margin Value = MRP x Margin%
        var marginAmount = Math.Round(mrp * marginPercent / 100m, 2);

        // Step 2: GST Payable % = IF(MRP <= 2625, 5%, 18%)
        var gstPayablePercent = mrp <= 2625m ? 5m : 18m;

        // Step 3: GST Payable Value = MRP x GST% / (GST% + 1)
        // This extracts the embedded GST from the MRP (reverse calculation).
        // GST% here is expressed as a fraction, e.g. 5% = 0.05, 18% = 0.18
        var gstFraction = gstPayablePercent / 100m;
        var gstPayableValue = Math.Round(mrp * gstFraction / (gstFraction + 1m), 2);

        // Step 4: Billing Exclusive GST = MRP - Margin Value - GST Payable Value
        var billingExclGST = Math.Round(mrp - marginAmount - gstPayableValue, 2);

        // Step 5: GST Reimbursement % = IF(Billing Exclusive <= 2500, 5%, 18%)
        var gstReimbursementPercent = billingExclGST <= 2500m ? 5m : 18m;

        // Step 6: GST Reimbursement Value = Billing Exclusive x GST Reimbursement %
        var gstReimbursementValue = Math.Round(billingExclGST * gstReimbursementPercent / 100m, 2);

        // Step 7: Billing Inclusive GST = Billing Exclusive + GST Reimbursement Value
        var billingInclGST = Math.Round(billingExclGST + gstReimbursementValue, 2);

        // Taxable value for GST filing = billingExclGST * quantity
        var taxableValue = Math.Round(billingExclGST * quantity, 2);

        // Line total = billingInclGST * quantity
        var lineTotal = Math.Round(billingInclGST * quantity, 2);

        return new ElCurioLineResult
        {
            MarginAmount = marginAmount,
            GSTPayablePercent = gstPayablePercent,
            GSTPayableValue = gstPayableValue,
            UnitPrice = billingExclGST,
            GSTReimbursementPercent = gstReimbursementPercent,
            GSTReimbursementValue = gstReimbursementValue,
            TotalBilling = billingInclGST,
            TaxableValue = taxableValue,
            LineTotal = lineTotal
        };
    }
}

/// <summary>
/// Result of the EL CURIO margin calculation for a single line item.
/// All per-unit values unless otherwise noted.
/// </summary>
public class ElCurioLineResult
{
    /// <summary>Margin amount per unit = MRP x Margin%.</summary>
    public decimal MarginAmount { get; set; }

    /// <summary>GST Payable percent derived from MRP slab (5% or 18%).</summary>
    public decimal GSTPayablePercent { get; set; }

    /// <summary>GST Payable value per unit = MRP x GST% / (GST% + 1).</summary>
    public decimal GSTPayableValue { get; set; }

    /// <summary>Billing exclusive of GST per unit = MRP - Margin - GST Payable.</summary>
    public decimal UnitPrice { get; set; }

    /// <summary>GST Reimbursement percent derived from billing-exclusive slab (5% or 18%).</summary>
    public decimal GSTReimbursementPercent { get; set; }

    /// <summary>GST Reimbursement value per unit = BillingExcl x Reimbursement%.</summary>
    public decimal GSTReimbursementValue { get; set; }

    /// <summary>Billing inclusive of GST per unit = BillingExcl + Reimbursement.</summary>
    public decimal TotalBilling { get; set; }

    /// <summary>Taxable value = BillingExcl x Quantity.</summary>
    public decimal TaxableValue { get; set; }

    /// <summary>Line total = BillingIncl x Quantity.</summary>
    public decimal LineTotal { get; set; }
}
