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
  resolves = [
    "publish",
    "release-upload-artifacts",
    "release-filter published",
  ]
}

action "release-filter published" {
  uses = "actions/bin/filter@master"
  args = "action published"
}

action "publish" {
  args = "publish --access public"
  needs = ["build"]
  uses = "actions/npm@master"
  secrets = ["NPM_AUTH_TOKEN"]
}

action "release-upload-artifacts" {
  uses = "judge2020/github-action-publish-binaries@master"
  needs = ["build"]
  args = "dist/**/*"
  secrets = ["GITHUB_TOKEN"]
}
