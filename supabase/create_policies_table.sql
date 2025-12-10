-- Create Policies Table for Legal Documents (Terms of Service and Privacy Policy)
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type VARCHAR(50) NOT NULL, -- 'terms_of_service', 'privacy_policy'
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  version INT DEFAULT 1,
  effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  app_uuid UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_policies_type_active ON policies(policy_type, is_active);

-- Insert Terms of Service (placeholder - replace with actual content)
INSERT INTO policies (policy_type, title, content, version, effective_date)
VALUES (
  'terms_of_service',
  'Terms of Service - VC Studio',
  '# Terms of Service

## 1. Acceptance of Terms
By accessing and using VC Studio, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License
Permission is granted to temporarily use VC Studio for personal, non-commercial transitory viewing only.

## 3. Disclaimer
The materials on VC Studio are provided on an "as is" basis. VC Studio makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.

## 4. Limitations
In no event shall VC Studio or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on VC Studio.

## 5. Revisions
VC Studio may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.

## 6. Contact Information
If you have any questions about these Terms of Service, please contact us.',
  1,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Insert Privacy Policy (placeholder - replace with actual content)
INSERT INTO policies (policy_type, title, content, version, effective_date)
VALUES (
  'privacy_policy',
  'Privacy Policy - VC Studio',
  '# Privacy Policy

## 1. Information We Collect
We collect information that you provide directly to us, such as when you create an account, make a purchase, or contact us for support.

## 2. How We Use Your Information
We use the information we collect to:
- Provide, maintain, and improve our services
- Process transactions and send related information
- Send technical notices and support messages
- Respond to your comments and questions

## 3. Information Sharing
We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.

## 4. Data Security
We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## 5. Your Rights
You have the right to access, update, or delete your personal information at any time. You may also opt out of certain communications from us.

## 6. Cookies
We use cookies to enhance your experience, gather general visitor information, and track visits to our website.

## 7. Changes to This Policy
We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.

## 8. Contact Us
If you have any questions about this Privacy Policy, please contact us.',
  1,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;






