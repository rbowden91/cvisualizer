# Mostly copied from repair50. Finds all the dependencies in the ast, which makes it easy for us to determine the bounds on
# which lines/characters of codes to include for highlighting when we're on a given node. Probably overkill to do it
# this way, but makes life easier.

import sys
import operator
from copy import deepcopy
from pycparser import c_generator, c_ast, c_lexer, c_parser, preprocess_file # type:ignore

def get_min_max(coord1, coord2, op):
    if coord1 is None:
        return coord2
    elif coord2 is None:
        return coord1
    # different files, always want the first
    elif coord1[0] != coord2[0]:
        return coord1
    else:
        if coord1[1] == coord2[1]:
            return coord1 if op(coord1[2], coord2[2]) else coord2
        else:
            return coord1 if op(coord1[1], coord2[1]) else coord2

get_min = lambda coord1, coord2: get_min_max(coord1, coord2, operator.lt)
get_max = lambda coord1, coord2: get_min_max(coord1, coord2, operator.gt)

def get_coord_helper(node, node_coords, parent=None, right_left=None):
    # don't yet know which of these will be relevant
    coords = {
        'right_left': right_left,

        'parent': parent,
        'left_child': None,
        'right_child': None,
        'self': str(node.coord).split(':') if node.coord is not None else None
    }

    if coords['self'] is not None:
        coords['self'][1], coords['self'][2] = int(coords['self'][1]), int(coords['self'][2])
        # TODO: fix weirdness with how #defines like isalpha work...
        if coords['self'][1] == 0 and coords['self'][2] == 1:
            coords['self'] = None
    coords['left_most'] = coords['self']
    coords['right_most'] = coords['self']
    node_coords[node] = coords

    children = node.children()
    for i in range(len(children)-1,-1,-1):
        child = children[i][1]
        child_coord, left_most, right_most = get_coord_helper(child, node_coords, coords['self'], right_left)
        if i == len(children)-1:
            coords['right_child'] = child_coord
        if i == 0:
            coords['left_child'] = child_coord

        # TODO: is the get_min really necessary, or are things properly ordered?
        coords['left_most'] = get_min(coords['left_most'], left_most)
        coords['right_most'] = get_max(coords['right_most'], right_most)
        right_left = left_most
    return coords['self'], coords['left_most'], coords['right_most']


# Note: doesn't copy the coordinates, and so they may reference one another
def get_coordinates(node):
    # we need this because we can't add attributes directly to nodes (thanks, slots)
    node_coords = {}
    get_coord_helper(node, node_coords)
    return node_coords
