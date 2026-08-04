# Prompts



## Initial



## Features



## Security

“Analyze our app carefully, being aware of context, dependencies, and functionality. Pay especially close attention to vulnerable areas such as user-input fields and API calls (especially mutations). Identify security concerns as well as suggestions for how to solve for these security concerns.” 

## Performance/Abstraction

“Walk through our application and, with attention to context and dependencies, read every function, event, and component. Identify both areas where abstraction might be possible to reduce code duplication and where refactoring can be done to improve performance. Look especially for opportunities to cache results, reduce unnecessary re-renders, and other easy wins.” 

## Clean-up

“Let’s look at all of our code and follow all of our components, functions, and events. Find code that is no-longer used due to refactors, or code that might be included in an import statement, but not actually used where it is imported. Identify all abandoned code and unused imports. Show them to me so that I can verify that the code is unused and no longer needed.”


## Overall

Please review the project and suggest:

Missing features that users would likely expect
UX or design improvements that would make it more polished
Code quality issues — anything fragile, redundant, or hard to maintain
Edge cases I might not have considered
Performance concerns if any stand out

For each suggestion, briefly explain why it matters and give a rough sense of effort (quick fix vs. significant work). Prioritize the highest-impact changes first.

### References

- https://base44.com/blog/prompts-for-vibe-coding
- https://seroter.com/2025/07/07/quality-focused-prompts-for-the-vibe-coding-addict/