OUTRUN V1 – AI LEAD DISCOVERY, COMPANY RESEARCH & LEAD SCORING ENGINE
________________________________________
OBJECTIVE
The Lead Discovery Engine is the core execution engine of Outrun.
Outrun must not simply return a list of companies.
It must return the best companies for the user's business and explain why.
The objective is quality over quantity.
A user should trust Outrun's recommendations enough that they stop searching elsewhere.
The user should feel:
"These are exactly the businesses I should be speaking to."
________________________________________
GLOBAL SEARCH
Search should understand natural language.
Examples:
Find plumbers in Texas.
Find accounting firms with under 20 employees.
Find South African logistics companies.
Find law firms that recently hired staff.
Find SaaS companies that raised funding.
Find businesses with poor websites.
Find companies with weak SEO.
Find restaurants that don't answer calls after hours.
Find companies using HubSpot.
Find businesses without online booking.
Find growing HVAC companies in California.
The AI should interpret intent rather than relying on exact keywords.
________________________________________
FILTERS
Users can refine searches using:
Industry
Country
State / Province
City
Company Size
Employee Count
Revenue (when available)
Technology Stack
Website Present
Google Rating
Review Count
Growth Signals
Funding Status (future)
Hiring Activity (future)
Keywords
Negative Keywords
Business Type
Years in Business
Language
Response Time
Custom Tags
Users should be able to save filter presets.
________________________________________
SEARCH RESULTS
Each result appears as a premium company card.
Each card displays:
Company Name
Industry
Location
Website
Company Size
Growth Score
Fit Score
Confidence Score
Quick Summary
Buttons:
Research
Save
Generate Outreach
Add to Campaign
________________________________________
FIT SCORE
Range:
0–100
Represents how well the company matches the user's ideal customer profile.
Factors may include:
Industry match
Location
Company size
Business model
Pain point alignment
Historical campaign performance
Target market
Website quality
Technology fit (if available)
Never present the score without explanation.
________________________________________
CONFIDENCE SCORE
Represents how confident Outrun is in its recommendation.
Examples:
95%
Strong website data
High ICP match
Historical success
68%
Limited public information
Some assumptions
Confidence is not quality.
Confidence is certainty.
________________________________________
AI RESEARCH
Clicking "Research" opens a complete company profile.
The AI prepares this automatically.
Sections include:
Company Summary
What They Do
Likely Pain Points
Why They Match
Growth Opportunities
Recommended Contact Angle
Suggested Decision Maker
Website Observations
Social Presence
Estimated Outreach Difficulty
AI Confidence
Suggested Next Step
Everything should be personalized.
Never use templates.
________________________________________
COMPANY SUMMARY
Maximum:
150 words.
Explain the business clearly.
Avoid generic descriptions.
________________________________________
WHY THEY MATCH
This is critical.
Examples:
Matches your preferred company size.
Operates in your highest-converting industry.
Recently expanded services.
Website suggests manual processes.
Current customers resemble your best-performing clients.
Every statement should reference available evidence or clearly indicate assumptions.
________________________________________
PAIN POINT ANALYSIS
Estimate likely business challenges.
Examples:
Missed calls
No online booking
Weak SEO
Low review count
Poor website messaging
Manual lead management
Outdated website
Low social proof
Separate observations from assumptions.
________________________________________
WEBSITE REVIEW
If website available:
Review:
Headline
Offer
Navigation
Calls-to-action
Contact options
Trust signals
Booking process
Mobile friendliness (future)
Speed (future)
Accessibility basics
Summarize strengths and weaknesses.
________________________________________
DECISION MAKERS
Identify likely contacts when possible.
Examples:
Owner
Founder
Managing Director
Marketing Director
Sales Director
Operations Manager
Clearly distinguish verified information from inferred roles.
________________________________________
CONTACT STRATEGY
Recommend:
Cold Email
LinkedIn
Phone
Referral
Partnership
Content
Networking
Explain why.
________________________________________
OUTREACH ANGLE
Generate a suggested first sentence.
Example:
"I noticed your firm has expanded into commercial projects recently..."
Explain why this opener was chosen.
Avoid fake personalization.
Never claim to have observed something that wasn't actually observed.
________________________________________
COMPANY TIMELINE
Display major events if available.
Examples:
Founded
Expanded
New office
Funding
Hiring
Product launch
Only display verifiable information.
________________________________________
SAVED COMPANIES
Users can:
Save
Tag
Favourite
Archive
Move between lists
Bulk select
Everything searchable.
________________________________________
LEAD LISTS
Examples:
Hot Prospects
Construction
Law Firms
Priority
This Week
Q3 Campaign
Lists should update dynamically.
________________________________________
BULK ACTIONS
Generate outreach
Create campaign
Export
Delete
Tag
Assign
Everything should be efficient.
________________________________________
DUPLICATE DETECTION
Never show duplicate companies.
Merge duplicates automatically.
Inform user.
________________________________________
SMART RECOMMENDATIONS
Examples:
These companies resemble your best customers.
These businesses recently became active.
These companies have poor websites.
These companies lack online booking.
These businesses recently expanded.
These companies fit your highest-performing campaign.
Recommendations should improve over time.
________________________________________
CONTINUOUS LEARNING
Every user action teaches Outrun.
Track:
Opened
Ignored
Saved
Contacted
Replied
Converted
Use these signals to improve future rankings.
________________________________________
SEARCH HISTORY
Store:
Searches
Filters
Results
Saved searches
Users can rerun previous searches instantly.
________________________________________
EXPORTS
CSV
Excel
PDF Report
CRM Export
API (future)
________________________________________
API ARCHITECTURE
Lead providers should be modular.
Support multiple providers.
Never tightly couple the application to a single data source.
Design provider interfaces so they can be replaced without changing business logic.
________________________________________
PERFORMANCE
Search should begin returning results quickly.
Stream additional results progressively.
Allow users to interact while enrichment continues.
Never block the interface waiting for all processing to complete.
________________________________________
SECURITY
Respect provider licensing.
Respect rate limits.
Protect customer data.
Log all API failures.
Retry gracefully.
Never expose API keys to the frontend.
________________________________________
FUTURE FEATURES
Buying intent
Funding events
Hiring signals
Technology changes
News monitoring
Competitor tracking
Website change detection
Intent scoring
Relationship mapping
Partner discovery
Do not build in V1.
Design for expansion.
________________________________________
SUCCESS METRIC
The Lead Discovery Engine succeeds if users consistently feel that Outrun surfaces higher-quality opportunities than they could have found manually, and clearly explains why each recommendation deserves their attention.
Every company should answer three questions immediately:
Why should I care about this business?
Why is it a good fit for me?
What should I do next?
If those answers are obvious, the engine has achieved its purpose.
