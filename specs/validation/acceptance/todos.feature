Feature: Managing a private todo list

  @story-1
  Rule: A new user can sign up for their own account

    Scenario: A first-time visitor signs up
      Given Maya has no account yet
      When Maya signs up for an account
      Then Maya has an account and is signed in

  @story-2
  Rule: A user must be signed in to reach their todos

    Scenario: A signed-in user reaches her list
      Given Maya has an account
      When Maya signs in
      Then Maya sees her list of todos

  @story-3
  Rule: A signed-in user can add a todo to their own list

    Scenario: Adding a new todo
      Given Maya is signed in and her list is empty
      When Maya adds a todo named "Buy milk"
      Then Maya's list has exactly one todo named "Buy milk"

    @negative
    Scenario: An empty todo is refused
      Given Maya is signed in and her list is empty
      When Maya tries to add a todo with no text
      Then Maya's list still has no todos

  @story-4
  Rule: A user sees only their own todos

    Scenario: Two users' lists stay separate
      Given Maya has added a todo named "Buy milk"
      And Sam has added a todo named "File taxes"
      When Sam views his list of todos
      Then Sam sees "File taxes" and does not see "Buy milk"

  @story-5
  Rule: A signed-in user can mark one of their own todos as done

    Scenario: Marking a todo done
      Given Maya has added a todo named "Buy milk" that is still pending
      When Maya marks "Buy milk" as done
      Then "Buy milk" shows as done on Maya's list

    @negative
    Scenario: A user cannot mark another user's todo as done
      Given Sam has added a todo named "File taxes" that is still pending
      When Maya tries to mark "File taxes" as done
      Then "File taxes" still shows as pending on Sam's list
