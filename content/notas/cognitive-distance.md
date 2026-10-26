---
title: "Cognitive Distance"
slug: cognitive-distance
source: 06ab47d9c04200
version: 1
date: 2026-10-26T00:46:08.116Z
updated: 2026-10-26T00:46:08.116Z
aliases: ["Cognitive Distance"]
---
Minimize cognitive distance should be always a goal when building on top of something that already exists. It allows you and others to better understand the gap from what was to what is.

This is particularly important when working with AI, they have this tendency of disregarding what's there and making too many and too big changes.

AI dont have a good sense of what is simple to understand for a human, in code. Probably also it don't have a good sense of what is simple for an AI to build on top of.

Humans will naturally make changes with short cognitive distance, simply because doing more work than needed doesn't make sense. AI is not bounded to that limit. It could rewrite everything from scratch always. It does not do that  so there is something in its training and defaults that has some sense of just doing the work. But it always will overreach as a default unless you ask explicitly to bound the change, to minimize cognitive distance, to think of a human reading the code afterwards.

The "smell" of complexity is a very important skill to have and apply when developing with AI, when reviewing AI made code. 

But what happens in  a world where humans don't read the code. Should rewrites be a natural part of AI flow? I think not, making too many changes to a system increases risk of breaking something. What refactoring patterns make sense in the age of AI?
