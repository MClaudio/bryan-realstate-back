import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import { FilesService } from './files.service'

@Controller('public/files')
export class PublicFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id')
  async redirectToUrl(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const { url } = await this.filesService.getUrl(id, req)
    return res.redirect(url)
  }
}
