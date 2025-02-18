import * as R from 'ramda';

/**
 * This doesn't have an ID because it's not required and we'll often have to
 * generate an ID, so that should use a different type than this raw data.
 */
export interface YamlTask {
  sourceId: string;
  priority: number | null;
  estimate: number | null;
  summary: string;
  dependents: Array<YamlTask>;
  subtasks: Array<YamlTask>;
}

export interface UiTree {
  dependents: Array<UiTree>;
  dependentsExpanded: boolean;
  subtasks: Array<UiTree>;
  subtasksExpanded: boolean;
}

export enum UiTreeProperty {
  DEPENDENTS_EXP = 'dependentsExpanded',
  SUBTASKS_EXP = 'subtasksExpanded',
}

export enum UiTreeLinkageProperty {
  DEPENDENTS = 'dependents',
  SUBTASKS = 'subtasks',
}

export interface UiTreeBranch {
  index: number;
  path: UiTreeLinkageProperty;
}

/**
 * return a UiTree model for the given yamlTaskList
 */
export function uiTreeFromYamlTask(activity: YamlTask): UiTree {
  const dependents = activity.dependents.map(uiTreeFromYamlTask);
  const subtasks = activity.subtasks.map(uiTreeFromYamlTask);
  const result = {
    dependents,
    dependentsExpanded: false,
    subtasks,
    subtasksExpanded: false,
  };
  return result;
}

/**
 * return boolean value of 'subtasksExpanded' at the subtaskPath in subtasksToExpand
 */
export function areLinkedTasksExpanded(
  uiTreePath: Array<UiTreeBranch>,
  uiTree: Array<UiTree>,
  booleanProperty: UiTreeProperty
): boolean {
  if (
    !uiTreePath ||
    uiTreePath.length === 0 ||
    !uiTree ||
    uiTree.length === 0 ||
    uiTreePath[0].index > uiTree.length - 1
  ) {
    console.log(
      'Empty or mismatched list for areLinkedTasksExpanded:',
      uiTreePath,
      uiTree
    );
    return false;
  }
  const nextNode = uiTreePath[0];
  if (uiTreePath.length === 1) {
    return uiTree[nextNode.index][booleanProperty];
  }
  const result = areLinkedTasksExpanded(
    R.drop(1, uiTreePath),
    uiTree[nextNode.index][nextNode.path],
    booleanProperty
  );
  return result;
}

/**
 * linkageProperty is currently 'subtasks' or 'dependents'
 *
 * return copy of uiTreeToEditOneSource with the item at path uiTreePath edited via editFun
 */
export function editUiTreeAtPathOneSource(
  linkageProperty: UiTreeLinkageProperty,
  editFun: (arg0: UiTree) => UiTree,
  uiTreePath: Array<UiTreeBranch>,
  uiTreesToEdit: Array<UiTree>
): Array<UiTree> {
  if (uiTreePath.length === 0) {
    return uiTreesToEdit;
  }
  if (uiTreePath[0].index > uiTreesToEdit.length - 1) {
    console.log(
      'Empty or mismatched list for editUiTreeAtPathOneSource:',
      uiTreePath,
      uiTreesToEdit
    );
    return uiTreesToEdit;
  }
  const branch = uiTreePath[0];
  const remainingPath: Array<UiTreeBranch> = R.drop(1, uiTreePath);
  let elem: UiTree = uiTreesToEdit[branch.index];
  if (remainingPath.length === 0) {
    elem = editFun(elem);
  } else {
    elem = R.set(
      R.lensProp(branch.path),
      editUiTreeAtPathOneSource(
        linkageProperty,
        editFun,
        remainingPath,
        elem[branch.path]
      ),
      elem
    );
  }

  return R.update(branch.index, elem, uiTreesToEdit);
}

export function editUiTreeAtPath(
  linkageProperty: UiTreeLinkageProperty,
  editFun: (arg0: UiTree) => UiTree,
  sourceId: string,
  uiTreePath: Array<UiTreeBranch>,
  uiTreesToEdit: Record<string, Array<UiTree>>
): Record<string, Array<UiTree>> {
  uiTreesToEdit[sourceId] = editUiTreeAtPathOneSource(
    linkageProperty,
    editFun,
    uiTreePath,
    uiTreesToEdit[sourceId]
  );
  return uiTreesToEdit;
}
