import { getPreviewBlock } from "../helpers/blockBuilder";
import { Block } from "@rocket.chat/ui-kit";

export async function PreviewBlock(
    url: string,
    title: string,
    description: string,
    dimnesions: {
        width: number;
        height: number;
    }
): Promise<Array<Block>> {
    const block: Block[] = [];

    const previewBlock = await getPreviewBlock(
        url,
        title,
        description,
        dimnesions
    );
    block.push(previewBlock);

    return block;
}
