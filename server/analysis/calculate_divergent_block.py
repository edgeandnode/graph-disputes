import itertools
import pandas as pd
import tensorflow as tf
from typing import List
from functools import reduce
from psycopg2.extras import NumericRange
from tensorflow.python.lib.io import file_io


def read_csv_file(filename):
    """
    This breaks if the directory strutcture changes at all.

    To fix this, make the directory structure more explanatory or
    IDEALLY make a query to the database for a path to get its indexer.

    ### @TODO: MAKE getting the indexer name a database query
    """

    indexer_name = filename.split("/")[-2]
    with file_io.FileIO(filename, "rb") as f:
        df = pd.read_csv(f, compression="gzip", encoding="utf-8")
        df = df.rename(
            columns={"digest": indexer_name}
        )  # used to track the indexer pairs
        return df


def read_csv_files(filename_pattern):
    filenames = tf.io.gfile.glob(filename_pattern)
    dataframes = [read_csv_file(filename) for filename in filenames]
    return dataframes


def poi_tables_to_dfs(dispute_id: str) -> List[pd.DataFrame]:
    """
    Read indexer poi files into a list of dataframes


    Methods:
    * Blocking: Pandas read_csv.

    As of version 0.24 of pandas, read_csv supports reading directly from
    Google Cloud Storage. Simply provide link to the bucket like this:

    df = pd.read_csv('gs://bucket/path.csv')

    * Blocking: Tensorflow FileIO.

    DATADIR='gs://my-bucket/some/dir'

    poidf = read_csv_files(os.path.join(DATADIR, 'poi*'))

    * ASYNC: Pull files locally into a buffer and read into pandas.

    Using #2

    ## @TODO:
    Make this path not so hardcoded? maybe always create a poi directory?
    Concern here is if there are entity tables uploaded which contain the word poi
    """

    poi_dfs = read_csv_files("gs://poi-disputes/{}/*/poi*.csv*".format(dispute_id))
    return poi_dfs


def map_block_range_to_lower(block_range: NumericRange):
    """
    All entries have a block range. If pulling from SQL, this will get the
    start of the range.
    """
    return block_range.lower


def convert_df_range(table_df: pd.DataFrame):
    """
    Taking the first index will get the lower part of the range

    Block ranges serialized into csvs are just strings formatted like [x,y)
    y could potentially be None type.
    """
    table_df["block_source"] = table_df["block_range"].map(
        lambda x: int(x.split(",")[0][1:])
    )
    return table_df


def dfs_to_divergent_blocks(dfs: List[pd.DataFrame]) -> pd.DataFrame:
    """
    Generate divergent block table

    Returns a pd.DataFrame of the format:

    | comparison         | divergent_block |
    |--------------------|-----------------|
    | indexer1_indexer2  | 10120231312     |
    | indexer1_indexer3  | 10212313141     |
    | indexer_2_indexer3 | 49495212        |

    """
    ranged_dfs = [convert_df_range(x) for x in dfs]
    poi_compare = reduce(
        lambda left, right: pd.merge(
            left, right, on="block_source", suffixes=("_left", "_right")
        ),
        ranged_dfs,
    )

    poi_compare = poi_compare.drop(
        [
            "vid",
            "vid_left",
            "vid_right",
            "id",
            "id_left",
            "id_right",
            "block_range_left",
            "block_range_right",
        ],
        axis=1,
        errors="ignore",
    )
    digest_columns = filter(
        lambda c: (c.__contains__("block") == False), poi_compare.columns
    )

    for pair in itertools.combinations(digest_columns, 2):
        column_name = pair[0] + "_" + pair[1]
        poi_compare[column_name] = poi_compare[pair[0]] == poi_compare[pair[1]]
        poi_compare[column_name + "_numeric"] = poi_compare[column_name].apply(
            lambda x: 1 if x else -1
        )

    numeric_df_columns = list(
        filter(lambda c: c.__contains__("numeric"), poi_compare.columns)
    )
    numeric_df_columns.append("block_source")
    poi_compare_numeric = poi_compare[numeric_df_columns]
    poi_compare_numeric.columns = poi_compare_numeric.columns.str.replace(
        "_numeric", ""
    )

    compare_columns = list(
        filter(
            lambda c: (c.__contains__("block") == False), poi_compare_numeric.columns
        )
    )
    divergent_blocks = pd.DataFrame(columns=["comparison", "divergent_block"])

    for column in compare_columns:
        index = (poi_compare_numeric[column].values == -1).argmax()
        divergent_blocks = divergent_blocks.append(
            {
                "comparison": column,
                # 'subgraph': subgraph_id,
                "divergent_block": poi_compare.iloc[index]["block_source"],
            },
            ignore_index=True,
        )
    return divergent_blocks


def generate_indexer_pair(df: pd.DataFrame) -> pd.DataFrame:
    df["indexer_id_1"] = df["comparison"].map(lambda x: x.split("_")[0])
    df["indexer_id_2"] = df["comparison"].map(lambda x: x.split("_")[-1])
    df["divergent_block"] = df["divergent_block"].map(lambda x: [x])
    return df


def calculate_divergent_blocks(dispute_id: str) -> pd.DataFrame:
    poi_dfs = poi_tables_to_dfs(dispute_id=dispute_id)
    divergent_blocks = dfs_to_divergent_blocks(poi_dfs)

    divergent_blocks = generate_indexer_pair(divergent_blocks)
    return divergent_blocks
