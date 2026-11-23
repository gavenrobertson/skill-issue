---
title: How This Guide Works
summary: The lesson pane, the IDE, running code, checking exercises, and how your progress is saved.
---

Welcome! This guide takes you from **zero** (never written a line of code) to **hero** (comfortable with
classes, templates, the standard library, and modern C++). Every lesson has three parts:

1. **Explanation**: what the feature is, why it exists, and every common way to write it.
2. **Quizzes**: quick questions to check you understood. Answer them before you move on.
3. **Exercises**: you write real C++ in the IDE on the right, and it is compiled and tested.

## The IDE

The panel on the right is a small IDE (Integrated Development Environment):

| Button | Shortcut | What it does |
| --- | --- | --- |
| **Run** | `Ctrl`/`⌘` + `Enter` | Compiles your code with GCC and runs it, using the text in **Input (stdin)** as keyboard input. |
| **Check** | `Ctrl`/`⌘` + `Shift` + `Enter` | Runs your code against every test case for the exercise and tells you which pass. |
| **Hint** | | Reveals the next hint, one at a time. |
| **Solution** | | Shows a reference solution. Try hard first, since you learn by struggling a bit. |
| **Reset** | | Puts the starter code back. |

Your code is compiled by a real compiler (GCC, C++20 mode) on [Compiler Explorer](https://godbolt.org),
so what works here works on your own machine too. You need an internet connection to run code.

Code examples in lessons that have a **▶ Run** button are complete programs. Click it to load the
example into the IDE's **Scratch** tab, where you can edit and experiment freely.

```cpp run
#include <iostream>

int main() {
    std::cout << "Click Run on this example, then change the text and run it again!\n";
}
```

## Your progress

Everything (finished exercises, quiz answers, and the code you've typed) is saved **in this browser
only** (localStorage). There is no account and no database. To move to another computer or keep a
backup, use **Settings → Export progress** and import the file on the other side.

## How exercises are checked

An exercise has test cases. Each test feeds some text to your program's **standard input** (as if
you typed it) and compares what your program prints to **standard output** with the expected output.
Trailing spaces and trailing blank lines are ignored, but everything else must match exactly,
including capitalization and punctuation. Some exercises also check that you used the syntax the
lesson is about (for example, "use a `switch` statement").

:::quiz
Where is your progress stored?

- [ ] On a server, in a database
- [x] In your browser's local storage
- [ ] In a file in the project's repository

Progress lives in your browser's localStorage. Use Export/Import in Settings to back it up or move it.
:::

:::exercise Your first check {easy}
Let's try the workflow. The starter program prints the wrong message. Change it so the program prints
exactly:

```
I am ready to learn C++!
```

Then press **Check**.

```cpp starter
#include <iostream>

int main() {
    std::cout << "Hello?\n";
}
```

```cpp solution
#include <iostream>

int main() {
    std::cout << "I am ready to learn C++!\n";
}
```

```hint
Only change the text between the double quotes. Keep the `\n` at the end, which means "new line".
```

```expected
I am ready to learn C++!
```
:::
