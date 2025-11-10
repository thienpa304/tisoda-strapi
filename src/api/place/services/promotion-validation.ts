/**
 * Promotion validation service
 * Validates promotion rules according to business requirements
 */

interface PromotionRule {
  name?: string
  type?: string
  start_at?: string | Date
  end_at?: string | Date | null
  discount_kind?: 'percent' | 'fixed'
  amount?: number
  apply_scope?: 'per_service' | 'per_booking'
  group_tiers?: Array<{
    min_users?: number
    discount_kind?: 'percent' | 'fixed'
    amount?: number
  }>
  application?: {
    service_ids?: string
    blackout_dates?: Array<{start: string; end: string | null}>
    booking_value_min?: number
    booking_value_max?: number
  }
}

interface ValidationError {
  field: string
  message: string
}

function validatePromotion(promotion: PromotionRule): ValidationError[] {
  const errors: ValidationError[] = []

  // 1. Validate name length
  if (promotion.name) {
    if (promotion.name.length < 1) {
      errors.push({
        field: 'name',
        message: 'Promotion name must be at least 1 character',
      })
    }
    if (promotion.name.length > 200) {
      errors.push({
        field: 'name',
        message: 'Promotion name must not exceed 200 characters',
      })
    }
  }

  // 2. Validate discount amount
  if (promotion.discount_kind && promotion.amount !== undefined) {
    if (promotion.discount_kind === 'percent') {
      // Percent: 2-90%
      if (promotion.amount < 2) {
        errors.push({
          field: 'amount',
          message: 'Discount percentage must be at least 2%',
        })
      }
      if (promotion.amount > 90) {
        errors.push({
          field: 'amount',
          message: 'Discount percentage must not exceed 90%',
        })
      }
    } else if (promotion.discount_kind === 'fixed') {
      // Fixed amount: minimum 1000 VND
      if (promotion.amount < 1000) {
        errors.push({
          field: 'amount',
          message: 'Discount amount must be at least 1000 VND',
        })
      }
    }
  }

  // 3. Validate validity dates
  if (promotion.start_at) {
    const startDate = new Date(promotion.start_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    startDate.setHours(0, 0, 0, 0)

    // Start date must be >= today
    if (startDate < today) {
      errors.push({
        field: 'start_at',
        message: 'Start date cannot be in the past',
      })
    }

    // End date validation
    if (promotion.end_at) {
      const endDate = new Date(promotion.end_at)
      endDate.setHours(0, 0, 0, 0)

      // End date must be >= start date (minimum 1 day promotion)
      if (endDate < startDate) {
        errors.push({
          field: 'end_at',
          message:
            'End date must be greater than or equal to start date (promotion must last at least 1 day)',
        })
      }
    }
  }

  // 4. Validate blackout dates
  if (
    promotion.application?.blackout_dates &&
    Array.isArray(promotion.application.blackout_dates)
  ) {
    const startDate = promotion.start_at ? new Date(promotion.start_at) : null
    const endDate = promotion.end_at ? new Date(promotion.end_at) : null

    promotion.application.blackout_dates.forEach((blackout, index) => {
      if (!blackout.start) return

      const blackoutStart = new Date(blackout.start)
      blackoutStart.setHours(0, 0, 0, 0)

      // Blackout start must be within validity period
      if (startDate) {
        startDate.setHours(0, 0, 0, 0)
        if (blackoutStart < startDate) {
          errors.push({
            field: `application.blackout_dates[${index}].start`,
            message:
              'Blackout start date must be within the promotion validity period',
          })
        }
      }

      // Blackout end validation
      if (blackout.end) {
        const blackoutEnd = new Date(blackout.end)
        blackoutEnd.setHours(0, 0, 0, 0)

        // Blackout end must be >= blackout start
        if (blackoutEnd < blackoutStart) {
          errors.push({
            field: `application.blackout_dates[${index}].end`,
            message:
              'Blackout end date must be greater than or equal to blackout start date',
          })
        }

        // Blackout end must be within validity (if validity has end date)
        if (endDate) {
          endDate.setHours(23, 59, 59, 999)
          if (blackoutEnd > endDate) {
            errors.push({
              field: `application.blackout_dates[${index}].end`,
              message:
                'Blackout end date must be within the promotion validity period',
            })
          }
        }
        // If validity has no end date, blackout can be any date after start
      }
    })
  }

  // 5. Validate group tiers
  if (promotion.group_tiers && Array.isArray(promotion.group_tiers)) {
    promotion.group_tiers.forEach((tier, index) => {
      // Min users: 2-99
      if (tier.min_users !== undefined) {
        if (tier.min_users < 2) {
          errors.push({
            field: `group_tiers[${index}].min_users`,
            message: 'Minimum users must be at least 2',
          })
        }
        if (tier.min_users > 99) {
          errors.push({
            field: `group_tiers[${index}].min_users`,
            message: 'Minimum users must not exceed 99',
          })
        }
      }

      // Discount validation for tier
      if (tier.discount_kind && tier.amount !== undefined) {
        if (tier.discount_kind === 'percent') {
          if (tier.amount < 2 || tier.amount > 90) {
            errors.push({
              field: `group_tiers[${index}].amount`,
              message: 'Tier discount percentage must be between 2% and 90%',
            })
          }
        } else if (tier.discount_kind === 'fixed') {
          if (tier.amount < 1000) {
            errors.push({
              field: `group_tiers[${index}].amount`,
              message: 'Tier discount amount must be at least 1000 VND',
            })
          }
        }
      }
    })
  }

  // 6. Validate booking value range
  if (promotion.application?.booking_value_min !== undefined) {
    if (promotion.application.booking_value_min < 0) {
      errors.push({
        field: 'application.booking_value_min',
        message: 'Minimum booking value must be non-negative',
      })
    }
  }
  if (promotion.application?.booking_value_max !== undefined) {
    if (promotion.application.booking_value_max < 0) {
      errors.push({
        field: 'application.booking_value_max',
        message: 'Maximum booking value must be non-negative',
      })
    }
    if (
      promotion.application.booking_value_min !== undefined &&
      promotion.application.booking_value_max <
        promotion.application.booking_value_min
    ) {
      errors.push({
        field: 'application.booking_value_max',
        message:
          'Maximum booking value must be greater than or equal to minimum booking value',
      })
    }
  }

  return errors
}

/**
 * Validate that final price after discount is not negative
 * @param originalPrice - Original service/booking price
 * @param discountKind - Type of discount
 * @param discountAmount - Discount amount
 * @returns Final price after discount
 */
function calculateFinalPrice(
  originalPrice: number,
  discountKind: 'percent' | 'fixed',
  discountAmount: number,
): number {
  if (discountKind === 'percent') {
    const discountValue = (originalPrice * discountAmount) / 100
    return Math.max(0, originalPrice - discountValue)
  } else {
    // Fixed discount
    return Math.max(0, originalPrice - discountAmount)
  }
}

export default {
  validatePromotion,
  calculateFinalPrice,
}
