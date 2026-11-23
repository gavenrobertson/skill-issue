# Content authoring guide

All course content lives in `content/`. The app loads it at build time, so adding or
editing a lesson is just editing Markdown. Nothing is stored on a server.

```
content/
  01-getting-started/
    module.json            {"title": "...", "description": "..."}
    01-how-this-works.md   one lesson per file, ordered by the number prefix
    02-what-is-cpp.md
```

- The number prefixes control order only. IDs come from the names **without** the
  prefix (`getting-started/what-is-cpp`), so you can reorder files without losing progress.
- Exercise IDs come from the exercise title, so **don't rename exercise titles** after
  you've used the site (you'd lose that exercise's saved code and its ✓).

Run `npm run verify` (or `node scripts/verify-content.mjs content/05-control-flow`) after
editing. It compiles every example and checks every exercise solution with `g++ -std=c++20 -Wall -Wextra`.

## Lesson file

````md
---
title: Variables and Initialization
summary: One sentence shown under the title and in search.
---

Normal Markdown: headings (start at `##`), lists, tables, **bold**, `inline code`.

```cpp
// Plain cpp fence: syntax-highlighted snippet. Not compiled. Use for fragments.
int x = 5;
```

```cpp run
// "run" = a COMPLETE program. Gets a ▶ Run button that opens it in the IDE.
// Verified: must compile warning-free and finish with no input.
#include <iostream>
int main() { std::cout << "hi\n"; }
```

```output
hi
```

```cpp compile-error
// Shows code that does NOT compile (verified to fail). Great for "this is illegal".
int main() { int x = "hello"; }
```

> **Note:** Callouts are blockquotes starting with **Note:**, **Tip:**, **Warning:**, or **Pitfall:**.
````

An `output` fence right after a `cpp run` block shows what the program prints. Keep it accurate.

Markers:
- `cpp run warns` is a runnable example that intentionally triggers a compiler warning (to teach about it).
- `cpp starter broken` is an exercise starter that intentionally does not compile ("fix the errors" exercises).

## Exercises

````md
:::exercise Sum two numbers
Read two integers from standard input and print their sum.

**Input:** two integers `a` and `b` on one line.
**Output:** `a + b` followed by a newline.

```cpp starter
#include <iostream>

int main() {
    // read a and b, then print a + b
}
```

```cpp solution
#include <iostream>

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << a + b << '\n';
}
```

```hint
`std::cin >> a >> b;` reads two whitespace-separated values.
```

```stdin
2 3
```

```expected
5
```

```stdin
-10 4
```

```expected hidden
-6
```

```checks
must std::cin :: Read the numbers with std::cin.
mustnot \bprintf\b :: Use std::cout, not printf.
```
:::
````

Rules:
- `:::exercise <Title>` … `:::` — the title must be unique within the lesson.
- Exactly one `cpp starter` and one `cpp solution`. The starter should **compile** and should
  **not** already pass the tests.
- Tests are `stdin` (optional) + `expected` pairs. Each `expected` closes one test. Output is
  compared after trimming trailing whitespace on each line and trailing blank lines. `expected hidden`
  hides the expected output from the learner until they pass it.
- Make tests check real behavior: at least 2 tests, including an edge case (zero, negative, empty, large).
- `hint` fences (any number, shown one at a time) contain Markdown.
- `checks`: one per line, `must <regex> :: message` or `mustnot <regex> :: message`. JavaScript
  regex, run on the code with comments and string contents removed. Use these to make sure the
  learner actually practiced the lesson's syntax (e.g. `must \bswitch\s*\(` in the switch lesson).
- Be exact about the output format in the prompt, so learners don't fail on spacing.

## Quizzes

````md
:::quiz
What does this print?

```cpp
std::cout << 7 / 2;
```

- [ ] `3.5`
- [x] `3`
- [ ] `4`

Integer division truncates toward zero, so `7 / 2` is `3`.
:::
````

Options are single lines starting with `- [ ]` or `- [x]`. One or more can be correct.
Anything after the options is the explanation, shown after answering.

## Style

- Assume zero prior knowledge, but don't be wordy. Explain *why*, not just *what*.
- Cover every syntax variation of the topic, and show each one in code.
- Mention common mistakes and what the compiler error looks like.
- Use `std::` explicitly in examples (no `using namespace std;` except where that is the topic).
- Target C++20 (GCC 13+). Mention C++23 features as such, without making exercises depend on them.
- Each lesson: explanation with examples, 1 to 3 quizzes, and 2 to 4 exercises that go from easy to harder.
