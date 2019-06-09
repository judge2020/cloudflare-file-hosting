action "npm-install" {
  uses = "actions/npm@master"
  args = "ci"
}

action "build" {
  needs = ["npm-install"]
  uses = "actions/npm@master"
  args = "run dist"
}

workflow "build" {
  on = "push"
  resolves = ["build"]
}

