action "npm-install" {
  uses = "actions/npm@master"
  args = "ci"
}

action "build" {
  uses = "actions/npm@master"
  needs = ["npm-install"]
  args = "run dist"
}

workflow "push" {
  on = "push"
  resolves = ["build"]
}

workflow "release" {
  on = "release"
  resolves = ["build"]
}
action "publish" {
  args = "publish --access public"
  needs = ["build"]
  uses = "actions/npm@master"
  secrets = ["NPM_AUTH_TOKEN"]
}
