# OTP Bypass for Specific Phone Number

## Purpose
This configuration allows skipping OTP verification for a specific phone number (`+573116638572`) without changing environment variables.

## Implementation Details

### Files Modified
- `src/app/actions.ts` - Added specific phone number bypass logic in two locations:
  1. Line 370: In `verifySmsOtpAction()` function - skips OTP validation entirely
  2. Line 643: In re-send OTP flow - allows re-sending OTP bypass

### How It Works
The code checks if the normalized phone number matches `+573116638572` and bypasses OTP validation when true:

```javascript
const SPECIFIC_BYPASS_NUMBER = '+573116638572';
if (BYPASS_OTP || IS_DEV_OR_QA || fullPhoneNumber === SPECIFIC_BYPASS_NUMBER) {
  // Skip OTP validation - create session directly
}
```

## Usage

### For Testing/Debugging (No Configuration Needed)
The specific number `+573116638572` will automatically bypass OTP validation without requiring any environment variable changes.

### To Completely Disable Bypass (Remove the Feature)
Simply remove the `SPECIFIC_BYPASS_NUMBER` constant and the `|| fullPhoneNumber === SPECIFIC_BYPASS_NUMBER` conditions from both locations in `actions.ts`.

## Safety Notes
- This bypass is designed for testing/debugging purposes only
- The bypass is explicitly tied to one specific phone number
- No changes to environment variables required
- Easy to remove by deleting the added lines