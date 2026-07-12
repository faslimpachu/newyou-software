You are working on an already developed Hospital Patient Management System. This is NOT a redesign. Update the existing application by implementing the following enhancements, bug fixes, workflow improvements, and UI refinements while maintaining the current architecture and coding standards.

Important Requirements

Do not break any existing functionality.
Preserve the current UI theme and layout.
Follow the existing code structure and component architecture.
Implement all changes completely (frontend, backend, database, validation, printing, and APIs where required).
Ensure every feature is production-ready.
All print layouts must be true A4 documents using dedicated print templates (not browser screenshots).
1. Patient Registration Improvements
Form Validation

Implement complete validation for every field.

Mandatory Fields
Consultation Type
Patient Name
Parent/Father/Husband/Mother Name
Gender
Mobile Number
Address
District
State
PIN Code
Mobile Number Validation
Accept only numeric values
Exactly 10 digits
No alphabets
No special characters
No duplicate registration using the same mobile number unless it is an existing patient
Address

Make Address mandatory.

Display validation messages for all required fields.

Use both client-side and server-side validation.

Registration Workflow

After successful patient registration:

Automatically create the patient's first visit.
Generate a Visit record.
Mark the patient as "Visited".
Redirect directly to the Patient Profile or OP Registration page.
MR Number Generation

Generate MR Numbers based on consultation category.

Nutrition patients:

NU000001
NU000002
NU000003

Ayurcare patients:

AY000001
AY000002
AY000003

Requirements:

Separate running sequences
Never duplicate
Immutable once generated
2. OP Sheet Improvements
Clinical Examination

Increase the size of the Clinical Examination text area significantly.

It should comfortably support long medical notes.

Use a multi-line expandable text area.

OP Sheet Actions

Add:

Save
Save & Continue
Edit
Update
Print
Export PDF

Users should be able to edit OP sheets at any time.

Maintain version history if possible.

3. Prescription Module Improvements

Create a true hospital-style prescription template.

Do not print the webpage.

Use dedicated printable A4 templates.

Dynamic Hospital Header

The prescription header must change automatically according to the patient's consultation category.

Nutrition Header

NEW YOU

Lose Weight. Choose Health.

Centre for Professional Weight Management

JUBILEE BAZAR

ONDEN ROAD

KANNUR-670001

KERALA

PH:

8111999581

8111999582

Ayurcare Header

Ayurcare Center

JUBILEE BAZAR

ONDEN ROAD

KANNUR-670001

KERALA

PH:

8111999581

8111999582

Use the correct header automatically based on the patient's registration category.

Prescription Layout

Include:

Hospital Header

Patient Details

Patient Name
MR Number
Age
DOB
Gender
Blood Group
Mobile Number
Address
Date
Doctor

Diagnosis

Medicines

Advice

Follow-up

Doctor Signature

Professional footer

Blank Prescription

Allow staff to print a blank prescription sheet.

The blank prescription should include:

Hospital Header
Patient Details Section
Empty Prescription Area
Doctor Signature Area

This should print exactly like a professional hospital prescription pad.

4. Printing Improvements

Current printing behaves like taking a screenshot.

Replace this completely.

Implement dedicated print layouts using print-specific templates.

Requirements:

A4 Portrait
Proper margins
Page breaks
Hospital formatting
Clean typography
No browser UI
No buttons
No navigation
No sidebar

Printing should be professional for:

Prescription
OP Sheet
Bills
Patient Details
Reports
Patient List
5. Patient Profile Improvements

Remove the following tabs:

Bills
Payments
Timeline

Keep only relevant clinical information.

Documents Module

Add a Documents section.

Staff should be able to:

Upload documents

View documents

Download documents

Replace documents

Delete documents

Supported file types:

PDF

Images

Word Documents

Scanned Reports

Each document should include:

Title

Category

Uploaded Date

Uploaded By

Remarks

6. Visits Module

When clicking any patient inside Visits:

Open the Patient Profile directly.

Visit Status

Allow changing visit status.

Statuses:

Waiting

In Consultation

Completed

Cancelled

No Show

Follow-up

Appointment Time

Allow assigning:

Appointment Date

Appointment Time Slot

Doctor

Dietitian

7. Patients Module

Improve patient listing.

Clicking a patient should open the Patient Profile.

Export

Allow:

Print

Export PDF

Export Excel

Export CSV

Do not print the webpage.

Generate proper printable reports.

Patient Status

Allow changing patient status.

Examples:

Active

Inactive

Waiting

Consulting

Completed

Cancelled

Follow-up

8. Nutrition Module

Create a dedicated Nutrition Management page.

Display table:

Patient Name
Phone Number
Program
Dietitian
Review Date
Status
New Assessment

When clicking "New Assessment":

Ask for MR Number.

Automatically fetch patient details.

Display patient summary.

Create a Nutrition Assessment.

Fields:

Assessment Date

Program

Weight

BMI

Body Fat

Diet Plan

Observations

Recommendations

Notes

Review Date

Dietitian

Allow:

Save

Edit

Update

Delete

Print

Export PDF

Display previous assessments inside the Patient Profile.

9. Ayurcare Module

Create dedicated Ayurcare Management.

Table:

Patient Name

Phone

Treatment Plan

Practitioner

Review Date

Status

New Treatment

Ask for MR Number.

Fetch patient automatically.

Create Treatment Plan.

Fields:

Diagnosis

Treatment Plan

Medicines

Procedures

Therapies

Advice

Practitioner

Review Date

Notes

Allow:

Save

Edit

Update

Delete

Print

Export PDF

Display treatment history.

10. Follow-up Module

Create Follow-up Management.

Display:

Patient Name

Address

Contact Number

Program

Due Date

Assigned To

Status

Remarks

Clicking patient opens Patient Profile.

Schedule Follow-up

Create New Follow-up.

Enter MR Number.

Automatically fetch patient.

Enter:

Program

Review Date

Assigned To

Priority

Remarks

Status

Save Follow-up.

11. Universal Billing System

Create one centralized billing system for the entire clinic.

Staff should be able to create invoices for any purpose.

Examples:

Registration Fee

Consultation

Treatment

Procedure

Medicine

Lab

Package

Miscellaneous

Invoice

Professional hospital invoice.

Automatically use clinic header based on patient category.

Nutrition patients:

Use NEW YOU header.

Ayurcare patients:

Use Ayurcare header.

Patient Details

Include:

Patient Name

MR Number

Age

DOB

Blood Group

Address

Contact Number

Invoice Number

Invoice Date

Consultation Type

Billing Features

Dynamic bill items.

Add

Edit

Delete

Quantity

Rate

Discount

Tax

Subtotal

Grand Total

Payment Method

Paid Amount

Balance

Remarks

Invoice Actions

Save

Edit

Update

Print

Export PDF

Email (future ready)

Clicking any invoice should open the complete invoice.

Printing must generate a professional A4 hospital invoice.

12. General Improvements

Implement professional validation throughout the application.

Improve responsiveness.

Improve loading states.

Improve empty states.

Improve error handling.

Improve toast notifications.

Improve table filtering.

Improve search performance.

Improve pagination.

Improve print quality.

Improve typography.

Improve spacing.

Improve overall user experience.

Final Deliverable

Implement all requested enhancements completely across the existing application.

The updated system must:

Preserve existing functionality.
Be fully functional and production-ready.
Include validation for every form.
Include dedicated A4 print templates.
Generate professional hospital-grade documents.
Support editing and updating all clinical records.
Maintain clean, reusable, scalable code following the existing project architecture.

The final result should feel like a commercial-grade Hospital Management System suitable for daily use in a Nutrition Center and Ayurcare Center, with professional workflows, document management, billing, printing, patient tracking, and clinical record management.


under billing menu make universal billing system design . one billing system for entire clinic . when staff click create invoice make sure staff can create any type of bill they want . and note: make the bill professional and professional hospital bill in A4 formate . the header shoud be if the user consulting under Nutriition center  if nutrition use this header New You ( sub headng : Lose Weight. Choose health ) center for professional weight management. address: JUBILEE BAZAR , ONDEN ROAD, KANNUR-670001,KERALA,INDIA . PH:8111999581, 8111999582 in prescription header . make it professional prescription . and if the user consulting under Ayurcare if Ayurcare use this header Ayurcare Center address: JUBILEE BAZAR , ONDEN ROAD, KANNUR-670001,KERALA,INDIA . PH:8111999581, 8111999582.create bill  with this  hospital address and patient detils like name ,MR number, age , dob , blood , address , contact info etc. when i click any table bill item show the bill and make sure able to print and export as pdf option . also make sure easly creating new bill for every purposes with print and export pdf option


in prescription section the header should be the category of the patient treatment . for eg: if the user consulting under Nutriition center  if nutrition use this header New You ( sub headng : Lose Weight. Choose health ) center for professional weight management. address: JUBILEE BAZAR , ONDEN ROAD, KANNUR-670001,KERALA,INDIA . PH:8111999581, 8111999582 in prescription header . make it professional prescription . and if the user consulting under Ayurcare if Ayurcare use this header Ayurcare Center address: JUBILEE BAZAR , ONDEN ROAD, KANNUR-670001,KERALA,INDIA . PH:8111999581, 8111999582. use this header for all billing and op and priscription sheets etc  also use this header in billing .add hospital address+ patient detils like name ,MR number, age , dob , blood , address , contact info etc.
 and also make able to print the blank priscription sheet as needed with hospital header and patient details .currently it prints like a screeshot of the page . not like that . i need professional hospital level like priscription. remove bills and payments, timeline from patient profile . make sure staff can able to attach any documents related to particular patient .